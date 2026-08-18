// Data-driven & scheduled notification generators. Run by /api/cron/alerts.
// Each generator is idempotent (dedup_key) and respects its type's settings.

import db from '@/lib/db';
import { createNotification, getNotificationConfig } from '@/lib/notifications';
import { NOTIFICATION_TYPE_MAP } from '@/lib/notification-types';

const num = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const fmtMad = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} MAD`;

/**
 * Supplier payments coming due / overdue — from unpaid purchase orders
 * (expected_date) and vendor invoices that carry an explicit due_date.
 */
export async function generateSupplierPaymentDue(): Promise<number> {
  const type = 'supplier_payment_due';
  const { enabled, config } = await getNotificationConfig(type);
  if (!enabled) return 0;
  const lead = num(config.lead_time_days, 3);
  const def = NOTIFICATION_TYPE_MAP[type];
  let created = 0;

  // Purchase orders not fully paid, due within the lead window (or already overdue).
  const { rows: pos } = await db.query<{
    id: string; name: string; total_amount: string; paid_amount: string; expected_date: string; overdue: boolean;
  }>(
    `SELECT po.id, v.name,
            po.total_amount, po.paid_amount, po.expected_date,
            (po.expected_date < CURRENT_DATE) AS overdue
     FROM purchase_orders po
     JOIN vendors v ON v.id = po.vendor_id
     WHERE po.status IN ('pending','received')
       AND po.expected_date IS NOT NULL
       AND COALESCE(po.paid_amount,0) < COALESCE(po.total_amount,0)
       AND po.expected_date <= CURRENT_DATE + $1::int`,
    [lead],
  );
  for (const po of pos) {
    const remaining = Number(po.total_amount) - Number(po.paid_amount);
    const id = await createNotification({
      type,
      title: po.overdue ? `Paiement en retard : ${po.name}` : `Paiement fournisseur à échéance : ${po.name}`,
      message: `Bon de commande — ${fmtMad(remaining)} ${po.overdue ? `en retard depuis le ${po.expected_date}` : `dû le ${po.expected_date}`}.`,
      severity: po.overdue ? 'danger' : def.severity,
      link: def.link,
      requiredPermission: def.requiredPermission,
      dedupKey: `${type}:po:${po.id}`,
    });
    if (id) created++;
  }

  // Vendor invoices with an explicit due date, not yet marked paid.
  const { rows: invs } = await db.query<{
    id: string; name: string; total_amount: string; due_date: string; overdue: boolean;
  }>(
    `SELECT vi.id, v.name, vi.total_amount, vi.due_date,
            (vi.due_date < CURRENT_DATE) AS overdue
     FROM vendor_invoices vi
     JOIN vendors v ON v.id = vi.vendor_id
     WHERE vi.due_date IS NOT NULL
       AND COALESCE(vi.status,'') <> 'paid'
       AND vi.due_date <= CURRENT_DATE + $1::int`,
    [lead],
  );
  for (const inv of invs) {
    const id = await createNotification({
      type,
      title: inv.overdue ? `Facture en retard : ${inv.name}` : `Facture fournisseur à échéance : ${inv.name}`,
      message: `Facture — ${fmtMad(Number(inv.total_amount))} ${inv.overdue ? `en retard depuis le ${inv.due_date}` : `due le ${inv.due_date}`}.`,
      severity: inv.overdue ? 'danger' : def.severity,
      link: def.link,
      requiredPermission: def.requiredPermission,
      dedupKey: `${type}:inv:${inv.id}`,
    });
    if (id) created++;
  }
  return created;
}

/**
 * Vendors whose outstanding balance (debts − payments) exceeds the threshold.
 * Reconciled like low-stock: one active alert per vendor, cleared when settled.
 */
export async function generateSupplierBalanceHigh(): Promise<number> {
  const type = 'supplier_balance_high';
  const { enabled, config } = await getNotificationConfig(type);
  const def = NOTIFICATION_TYPE_MAP[type];
  if (!enabled) {
    await db.query(`DELETE FROM notifications WHERE type = $1`, [type]);
    return 0;
  }
  const threshold = num(config.threshold_mad, 10000);

  const { rows: over } = await db.query<{ id: string; name: string; balance: string }>(
    `SELECT v.id, v.name,
            COALESCE(SUM(CASE WHEN t.type='debt' THEN t.amount
                              WHEN t.type='payment' THEN -t.amount ELSE 0 END), 0) AS balance
     FROM vendors v
     JOIN vendor_transactions t ON t.vendor_id = v.id
     GROUP BY v.id, v.name
     HAVING COALESCE(SUM(CASE WHEN t.type='debt' THEN t.amount
                              WHEN t.type='payment' THEN -t.amount ELSE 0 END), 0) > $1`,
    [threshold],
  );

  const keys = over.map((v) => `${type}:${v.id}`);
  // Clear alerts for vendors no longer over the threshold.
  if (keys.length) {
    await db.query(
      `DELETE FROM notifications WHERE type = $1 AND dedup_key <> ALL($2::text[])`,
      [type, keys],
    );
  } else {
    await db.query(`DELETE FROM notifications WHERE type = $1`, [type]);
  }

  let created = 0;
  for (const v of over) {
    const id = await createNotification({
      type,
      title: `Solde fournisseur élevé : ${v.name}`,
      message: `Montant dû : ${fmtMad(Number(v.balance))} (seuil : ${fmtMad(threshold)}).`,
      severity: def.severity,
      link: def.link,
      requiredPermission: def.requiredPermission,
      dedupKey: `${type}:${v.id}`,
      push: false, // reconcile pass — avoid a push storm; first creation already pushed
    });
    if (id) created++;
  }
  return created;
}

/** Monthly reminder to prepare/pay salaries, fired on/after the configured day. */
export async function generatePayrollDue(): Promise<number> {
  const type = 'payroll_due';
  const { enabled, config } = await getNotificationConfig(type);
  if (!enabled) return 0;
  const dayOfMonth = num(config.day_of_month, 28);
  const def = NOTIFICATION_TYPE_MAP[type];

  const { rows } = await db.query<{ day: number; month: string }>(
    `SELECT EXTRACT(DAY FROM (now() AT TIME ZONE 'Africa/Casablanca'))::int AS day,
            to_char((now() AT TIME ZONE 'Africa/Casablanca'), 'YYYY-MM') AS month`,
  );
  const { day, month } = rows[0];
  if (day < dayOfMonth) return 0; // not yet time this month

  const id = await createNotification({
    type,
    title: 'Rappel : paie mensuelle',
    message: `Pensez à préparer et verser les salaires du mois ${month}.`,
    severity: def.severity,
    link: def.link,
    requiredPermission: def.requiredPermission,
    dedupKey: `${type}:${month}`,
  });
  return id ? 1 : 0;
}

/** Active staff whose contract end date falls within the lead window. */
export async function generateContractExpiry(): Promise<number> {
  const type = 'contract_expiry';
  const { enabled, config } = await getNotificationConfig(type);
  if (!enabled) return 0;
  const lead = num(config.lead_time_days, 30);
  const def = NOTIFICATION_TYPE_MAP[type];

  const { rows } = await db.query<{ id: string; first_name: string; last_name: string; contract_end_date: string }>(
    `SELECT id, first_name, last_name, contract_end_date
     FROM staff_members
     WHERE is_active = true
       AND contract_end_date IS NOT NULL
       AND contract_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $1::int`,
    [lead],
  );

  let created = 0;
  for (const s of rows) {
    const id = await createNotification({
      type,
      title: `Contrat à échéance : ${s.first_name} ${s.last_name}`,
      message: `Le contrat se termine le ${s.contract_end_date}.`,
      severity: def.severity,
      link: def.link,
      requiredPermission: def.requiredPermission,
      dedupKey: `${type}:${s.id}:${s.contract_end_date}`,
    });
    if (id) created++;
  }
  return created;
}

/**
 * Event hook: a salary record was created/paid for a staff member.
 * Notifies the employee's linked account when present, else personnel managers.
 */
export async function notifyPayslipReady(staffId: string, periodLabel: string): Promise<void> {
  const type = 'payslip_ready';
  const { enabled } = await getNotificationConfig(type);
  if (!enabled) return;
  const def = NOTIFICATION_TYPE_MAP[type];

  const { rows } = await db.query<{ profile_id: string | null; first_name: string; last_name: string }>(
    `SELECT profile_id, first_name, last_name FROM staff_members WHERE id = $1`,
    [staffId],
  );
  if (rows.length === 0) return;
  const staff = rows[0];

  await createNotification({
    type,
    title: 'Fiche de paie disponible',
    message: `Votre fiche de paie ${periodLabel} est enregistrée.`,
    severity: def.severity,
    link: def.link,
    requiredPermission: def.requiredPermission,
    targetUsers: staff.profile_id ? [staff.profile_id] : null,
    dedupKey: `${type}:${staffId}:${periodLabel}`,
  });
}

/** Run every scheduled/data-driven generator; returns a per-type count. */
export async function runAllAlertGenerators(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const tasks: Array<[string, Promise<number>]> = [
    ['supplier_payment_due', generateSupplierPaymentDue()],
    ['supplier_balance_high', generateSupplierBalanceHigh()],
    ['payroll_due', generatePayrollDue()],
    ['contract_expiry', generateContractExpiry()],
  ];
  for (const [name, p] of tasks) {
    try { out[name] = await p; } catch (e) { console.error(`alert generator ${name} failed:`, e); out[name] = -1; }
  }
  return out;
}
