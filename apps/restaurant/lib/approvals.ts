// Configurable approval workflow. A rule per module says which roles' writes
// must be reviewed and which roles may approve. When a write needs approval it
// is stored as a pending request; on approval it is replayed via an executor.

import db from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { createNotification } from '@/lib/notifications';
import { createAuditLog } from '@/lib/auth/audit';
import { applyDailyPurchase } from '@/lib/inventory-actions';
import type { AuthUser } from '@/lib/types/auth';

export const APPROVAL_MODULES = ['inventory', 'menu', 'finance'] as const;

export interface ApprovalRule {
  module: string;
  enabled: boolean;
  requester_roles: string[];
  approver_roles: string[];
}

export interface ApprovalRequest {
  id: string;
  module: string;
  action: string;
  payload: Record<string, unknown>;
  summary: string | null;
  requested_by: string | null;
  requested_by_name: string | null;
  status: string;
  created_at: string;
}

export async function getRule(module: string): Promise<ApprovalRule | null> {
  const { rows } = await db.query<ApprovalRule>(
    'SELECT module, enabled, requester_roles, approver_roles FROM approval_rules WHERE module = $1',
    [module]
  );
  return rows[0] || null;
}

/** Returns the rule when this user's write in this module must be approved, else null. */
export async function approvalRequiredFor(module: string, session: AuthUser): Promise<ApprovalRule | null> {
  if (session.role === 'admin') return null;
  const rule = await getRule(module);
  if (!rule || !rule.enabled) return null;
  if ((rule.approver_roles || []).includes(session.role)) return null; // approvers act directly
  if ((rule.requester_roles || []).includes(session.role)) return rule;
  return null;
}

export async function submitApprovalRequest(opts: {
  module: string;
  action: string;
  payload: unknown;
  summary: string;
  session: AuthUser;
  rule: ApprovalRule;
}): Promise<string> {
  const requester = opts.session.full_name || opts.session.email;
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO approval_requests (module, action, payload, summary, requested_by, requested_by_name, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id`,
    [opts.module, opts.action, JSON.stringify(opts.payload), opts.summary, opts.session.id, requester]
  );

  await createNotification({
    type: 'approval_request',
    title: "Demande d'approbation",
    message: `${requester} : ${opts.summary}`,
    severity: 'warning',
    link: '/admin/approvals',
    targetRoles: opts.rule.approver_roles,
    system: true,
  });

  await createAuditLog({
    userId: opts.session.id, userEmail: opts.session.email,
    action: 'approval_requested', resourceType: 'approval', resourceId: rows[0].id,
    newValues: { module: opts.module, action: opts.action, summary: opts.summary },
  });

  return rows[0].id;
}

// ── Executors: replay an approved request ────────────────────────────────────
type Executor = (payload: Record<string, unknown>) => Promise<void>;

const EXECUTORS: Record<string, Executor> = {
  inventory_daily_purchase: async (payload) => {
    const supabase = await createSupabaseServerClient();
    await applyDailyPurchase(
      supabase,
      payload.body as { items: never[]; date: string },
      (payload.userId as string) ?? null
    );
  },
  db_query: async (payload) => {
    await executeDbMutation(payload);
  },
};

async function executeDbMutation(body: Record<string, unknown>): Promise<void> {
  const action = body.action as string;
  const table = body.table as string;
  const data = body.data as Record<string, unknown>;
  const filters = (body.filters as Array<{ column: string; op: string; value: unknown }>) || [];

  if (action === 'insert') {
    await db.from(table).insert(data);
  } else if (action === 'update') {
    let q = db.from(table).update(data);
    for (const f of filters) if (f.op === '=' || f.op === 'eq') q = q.eq(f.column, f.value);
    await q;
  } else if (action === 'delete') {
    let q = db.from(table).delete();
    for (const f of filters) {
      if (f.op === '=' || f.op === 'eq') q = q.eq(f.column, f.value);
      else if (f.op === 'IN') q = q.in(f.column, f.value as unknown[]);
    }
    await q;
  }
}

// ── Review ───────────────────────────────────────────────────────────────────
export async function canApprove(module: string, session: AuthUser): Promise<boolean> {
  if (session.role === 'admin') return true;
  const rule = await getRule(module);
  return !!rule && (rule.approver_roles || []).includes(session.role);
}

export async function listPendingApprovals(session: AuthUser): Promise<ApprovalRequest[]> {
  const { rows } = await db.query<ApprovalRequest>(
    "SELECT id, module, action, payload, summary, requested_by, requested_by_name, status, created_at FROM approval_requests WHERE status = 'pending' ORDER BY created_at DESC LIMIT 100"
  );
  if (session.role === 'admin') return rows;
  const { rows: rules } = await db.query<{ module: string; approver_roles: string[] }>(
    'SELECT module, approver_roles FROM approval_rules'
  );
  const approvable = new Set(
    rules.filter(r => (r.approver_roles || []).includes(session.role)).map(r => r.module)
  );
  return rows.filter(r => approvable.has(r.module));
}

export async function reviewApproval(
  id: string,
  decision: 'approved' | 'rejected',
  note: string | null,
  session: AuthUser,
): Promise<{ ok: boolean; error?: string }> {
  const { rows } = await db.query<ApprovalRequest>(
    "SELECT * FROM approval_requests WHERE id = $1 AND status = 'pending'", [id]
  );
  if (!rows.length) return { ok: false, error: 'Request not found or already reviewed' };
  const req = rows[0];

  if (!(await canApprove(req.module, session))) return { ok: false, error: 'Forbidden' };

  if (decision === 'approved') {
    const exec = EXECUTORS[req.action];
    if (!exec) return { ok: false, error: `No executor for action "${req.action}"` };
    try {
      await exec(req.payload);
    } catch (e) {
      return { ok: false, error: 'Execution failed: ' + (e as Error).message };
    }
  }

  await db.query(
    `UPDATE approval_requests
     SET status = $2, review_note = $3, reviewed_by = $4, reviewed_by_name = $5, reviewed_at = now()
     WHERE id = $1`,
    [id, decision, note, session.id, session.full_name || session.email]
  );

  await createAuditLog({
    userId: session.id, userEmail: session.email,
    action: decision === 'approved' ? 'approval_approved' : 'approval_rejected',
    resourceType: 'approval', resourceId: id,
    newValues: { module: req.module, action: req.action, summary: req.summary, note },
  });

  if (req.requested_by) {
    await createNotification({
      type: 'approval_result',
      title: decision === 'approved' ? 'Demande approuvée' : 'Demande refusée',
      message: `${req.summary || ''}${note ? ' — ' + note : ''}`,
      severity: decision === 'approved' ? 'success' : 'info',
      link: '/admin',
      targetUsers: [req.requested_by],
      system: true,
    });
  }

  return { ok: true };
}
