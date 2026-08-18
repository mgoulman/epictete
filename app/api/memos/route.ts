import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession, enforce } from '@/lib/auth/supabase-server';
import { createNotification } from '@/lib/notifications';
import { createAuditLog } from '@/lib/auth/audit';

interface ReadEntry { id: string; name: string; read: boolean; read_at: string | null }

// Expand a memo's recipients (users + roles) into the full set of intended
// users, each annotated with whether they have read it.
async function buildReadTrack(memoId: string): Promise<ReadEntry[]> {
  const { rows: recs } = await db.query<{ recipient_type: string; recipient_value: string }>(
    'SELECT recipient_type, recipient_value FROM memo_recipients WHERE memo_id = $1', [memoId]
  );
  const userIds = new Set<string>();
  const roleNames: string[] = [];
  for (const r of recs) {
    if (r.recipient_type === 'user') userIds.add(r.recipient_value);
    else roleNames.push(r.recipient_value);
  }
  if (roleNames.length) {
    const { rows } = await db.query<{ id: string }>(
      `SELECT p.id FROM profiles p JOIN roles r ON r.id = p.role_id
       WHERE r.name = ANY($1::text[]) AND p.is_active = true`, [roleNames]
    );
    rows.forEach(x => userIds.add(x.id));
  }
  const ids = [...userIds];
  if (!ids.length) return [];
  const { rows: people } = await db.query<{ id: string; full_name: string | null; email: string | null; read_at: string | null }>(
    `SELECT p.id, p.full_name, p.email, mr.read_at
     FROM profiles p
     LEFT JOIN memo_reads mr ON mr.memo_id = $1 AND mr.user_id = p.id
     WHERE p.id = ANY($2::uuid[])
     ORDER BY p.full_name NULLS LAST, p.email`, [memoId, ids]
  );
  return people.map(p => ({ id: p.id, name: p.full_name || p.email || '—', read: !!p.read_at, read_at: p.read_at }));
}

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sp = new URL(request.url).searchParams;
  const box = sp.get('box');
  const id = sp.get('id');

  // Search linkable records for the compose form (authors only)
  const link = sp.get('link');
  if (link) {
    const denied = await enforce('memos.write'); if (denied) return denied;
    const q = `%${(sp.get('q') || '').trim()}%`;
    const QUERIES: Record<string, string> = {
      inventory: `SELECT id::text, name AS label, ('Stock: '||COALESCE(quantity,0)||' '||COALESCE(unit,'')) AS sub
                  FROM inventory_items WHERE name ILIKE $1 ORDER BY name LIMIT 20`,
      menu: `SELECT id::text, name AS label, COALESCE(price::text||' DH','') AS sub
             FROM menu_items WHERE name ILIKE $1 ORDER BY name LIMIT 20`,
      sales: `SELECT id::text, (product_name||COALESCE(' — '||sale_date,'')) AS label,
                     ('Ticket '||COALESCE(ticket_number,'—')) AS sub
              FROM sales_items WHERE product_name ILIKE $1 ORDER BY sale_date DESC NULLS LAST, created_at DESC LIMIT 20`,
      personnel: `SELECT id::text, (first_name||' '||last_name) AS label, COALESCE(position,'') AS sub
                  FROM staff_members WHERE (first_name||' '||last_name) ILIKE $1 ORDER BY first_name LIMIT 20`,
    };
    if (!QUERIES[link]) return NextResponse.json({ error: 'Unknown link type' }, { status: 400 });
    const { rows } = await db.query(QUERIES[link], [q]);
    return NextResponse.json({ results: rows });
  }

  // Picker data for the compose form (authors only)
  if (sp.get('meta')) {
    const denied = await enforce('memos.write'); if (denied) return denied;
    const { rows: users } = await db.query(
      `SELECT p.id, p.full_name, p.email, r.name AS role
       FROM profiles p LEFT JOIN roles r ON r.id = p.role_id
       WHERE p.is_active = true ORDER BY p.full_name NULLS LAST, p.email`
    );
    const { rows: roles } = await db.query('SELECT name, display_name FROM roles ORDER BY display_name');
    return NextResponse.json({ users, roles });
  }

  // Single report: record a read for recipients; return read-track for authors.
  if (id) {
    const { rows } = await db.query<Record<string, unknown>>('SELECT * FROM memos WHERE id = $1', [id]);
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const memo = rows[0];
    const { rows: rec } = await db.query(
      `SELECT 1 FROM memo_recipients WHERE memo_id = $1
       AND ((recipient_type='user' AND recipient_value=$2) OR (recipient_type='role' AND recipient_value=$3))
       LIMIT 1`, [id, session.id, session.role]
    );
    const isRecipient = rec.length > 0;
    const isAuthor = memo.author_id === session.id || session.role === 'admin';
    if (!isRecipient && !isAuthor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (isRecipient) {
      await db.query(
        'INSERT INTO memo_reads (memo_id, user_id) VALUES ($1, $2) ON CONFLICT (memo_id, user_id) DO NOTHING',
        [id, session.id]
      );
    }
    const readTrack = isAuthor ? await buildReadTrack(id as string) : null;
    const { rows: attachments } = await db.query(
      'SELECT id, name, url, mime, size FROM memo_attachments WHERE memo_id = $1 ORDER BY created_at', [id]
    );
    const { rows: links } = await db.query(
      'SELECT id, ref_type, ref_id, label, sub FROM memo_links WHERE memo_id = $1 ORDER BY created_at', [id]
    );
    return NextResponse.json({ memo, isAuthor, readTrack, attachments, links });
  }

  // Sent box: my authored reports with read stats.
  if (box === 'sent') {
    const { rows } = await db.query<Record<string, unknown>>(
      'SELECT * FROM memos WHERE author_id = $1 ORDER BY created_at DESC', [session.id]
    );
    for (const m of rows) {
      const track = await buildReadTrack(m.id as string);
      m.recipients_count = track.length;
      m.read_count = track.filter(t => t.read).length;
    }
    return NextResponse.json({ memos: rows });
  }

  // Inbox: reports addressed to me (directly or via my role), with read flag.
  const { rows } = await db.query(
    `SELECT m.id, m.title, m.priority, m.author_name, m.created_at,
            bool_or(mr.user_id IS NOT NULL) AS read
     FROM memos m
     JOIN memo_recipients rc ON rc.memo_id = m.id
        AND ((rc.recipient_type='user' AND rc.recipient_value=$1)
          OR (rc.recipient_type='role' AND rc.recipient_value=$2))
     LEFT JOIN memo_reads mr ON mr.memo_id = m.id AND mr.user_id = $1
     GROUP BY m.id
     ORDER BY m.created_at DESC`, [session.id, session.role]
  );
  return NextResponse.json({ memos: rows });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  // Remind unread recipients (author or admin only).
  if (body.action === 'remind') {
    const { rows } = await db.query<{ author_id: string | null; title: string }>(
      'SELECT author_id, title FROM memos WHERE id = $1', [body.id]
    );
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (rows[0].author_id !== session.id && session.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const unread = (await buildReadTrack(body.id)).filter(t => !t.read).map(t => t.id);
    if (unread.length) {
      await createNotification({
        type: 'memo_reminder', title: 'Rappel de lecture',
        message: `Merci de consulter le rapport : ${rows[0].title}`,
        severity: 'warning', link: `/admin/memos?id=${body.id}`,
        targetUsers: unread, system: true,
      });
    }
    await createAuditLog({ userId: session.id, userEmail: session.email, action: 'memo_reminded', resourceType: 'memo', resourceId: body.id, newValues: { reminded: unread.length } });
    return NextResponse.json({ reminded: unread.length });
  }

  // Create + publish a report.
  const denied = await enforce('memos.write'); if (denied) return denied;
  const { title, body: content, priority, recipients, attachments, links } = body;
  if (!title || !Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: 'Titre et destinataires requis' }, { status: 400 });
  }
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO memos (title, body, priority, author_id, author_name)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [title, content || '', priority === 'high' ? 'high' : 'normal', session.id, session.full_name || session.email]
  );
  const memoId = rows[0].id;
  const userVals: string[] = [], roleVals: string[] = [];
  for (const r of recipients) {
    if (r.type === 'user' && r.value) { userVals.push(r.value); }
    else if (r.type === 'role' && r.value) { roleVals.push(r.value); }
    await db.query(
      'INSERT INTO memo_recipients (memo_id, recipient_type, recipient_value) VALUES ($1, $2, $3)',
      [memoId, r.type, r.value]
    );
  }
  if (Array.isArray(attachments)) {
    for (const a of attachments) {
      if (!a?.url || !a?.name) continue;
      await db.query(
        'INSERT INTO memo_attachments (memo_id, name, url, path, mime, size) VALUES ($1,$2,$3,$4,$5,$6)',
        [memoId, a.name, a.url, a.path || null, a.mime || null, a.size || null]
      );
    }
  }
  if (Array.isArray(links)) {
    for (const l of links) {
      if (!l?.ref_type || !l?.ref_id || !l?.label) continue;
      await db.query(
        'INSERT INTO memo_links (memo_id, ref_type, ref_id, label, sub) VALUES ($1,$2,$3,$4,$5)',
        [memoId, l.ref_type, l.ref_id, l.label, l.sub || null]
      );
    }
  }
  await createNotification({
    type: 'memo_new', title: `Nouveau rapport : ${title}`,
    message: `De ${session.full_name || session.email}`,
    severity: priority === 'high' ? 'warning' : 'info',
    link: `/admin/memos?id=${memoId}`,
    targetUsers: userVals.length ? userVals : null,
    targetRoles: roleVals.length ? roleVals : null,
    system: true,
  });
  await createAuditLog({
    userId: session.id, userEmail: session.email,
    action: 'memo_published', resourceType: 'memo', resourceId: memoId,
    newValues: { title, recipients },
  });
  return NextResponse.json({ id: memoId });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
  const { rows } = await db.query<{ author_id: string | null }>('SELECT author_id FROM memos WHERE id = $1', [id]);
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (rows[0].author_id !== session.id && session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await db.query('DELETE FROM memos WHERE id = $1', [id]);
  await createAuditLog({ userId: session.id, userEmail: session.email, action: 'memo_deleted', resourceType: 'memo', resourceId: id });
  return NextResponse.json({ success: true });
}
