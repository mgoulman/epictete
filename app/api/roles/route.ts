import { NextRequest, NextResponse } from 'next/server';
import { enforce, getServerSession } from '@/lib/auth/supabase-server';
import { createAuditLog } from '@/lib/auth/audit';
import db from '@/lib/db';

// RBAC management API — admin only (users.manage).
// GET    → all roles (with their permission names + user counts) + all permissions
// POST   → create a custom (non-system) role
// PATCH  → rename/describe a role and/or set its exact permission list
// DELETE → delete a non-system role that has no users assigned

// GET /api/roles
export async function GET() {
  const denied = await enforce('users.manage'); if (denied) return denied;
  try {
    const { rows: roles } = await db.query(
      `SELECT r.id, r.name, r.display_name, r.description, r.is_system,
              COALESCE(array_agg(p.name) FILTER (WHERE p.name IS NOT NULL), '{}') AS permissions,
              (SELECT count(*)::int FROM profiles pr WHERE pr.role_id = r.id) AS user_count
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
       GROUP BY r.id
       ORDER BY r.is_system DESC, r.name`
    );
    const { rows: permissions } = await db.query(
      `SELECT id, name, resource, action, description FROM permissions ORDER BY resource, action`
    );
    return NextResponse.json({ roles, permissions });
  } catch (err) {
    console.error('Roles GET error:', err);
    return NextResponse.json({ error: 'Failed to load roles' }, { status: 500 });
  }
}

// POST /api/roles  { name, display_name, description? }
export async function POST(request: NextRequest) {
  const denied = await enforce('users.manage'); if (denied) return denied;
  try {
    const { name, display_name, description } = await request.json();
    if (!name || !display_name) {
      return NextResponse.json({ error: 'name and display_name are required' }, { status: 400 });
    }
    // Normalise the machine name to a safe slug.
    const slug = String(name).toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    if (!slug) return NextResponse.json({ error: 'Invalid role name' }, { status: 400 });

    const { rows: existing } = await db.query('SELECT id FROM roles WHERE name = $1', [slug]);
    if (existing.length) {
      return NextResponse.json({ error: `A role named "${slug}" already exists` }, { status: 409 });
    }

    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO roles (name, display_name, description, is_system)
       VALUES ($1, $2, $3, false) RETURNING *`,
      [slug, display_name, description || null]
    );
    const actor = await getServerSession();
    await createAuditLog({ userId: actor?.id, userEmail: actor?.email, action: 'create', resourceType: 'role', resourceId: rows[0].id, newValues: { name: slug, display_name } });
    return NextResponse.json({ role: rows[0] });
  } catch (err) {
    console.error('Roles POST error:', err);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}

// PATCH /api/roles  { id, display_name?, description?, permissions?: string[] }
export async function PATCH(request: NextRequest) {
  const denied = await enforce('users.manage'); if (denied) return denied;
  try {
    const { id, display_name, description, permissions } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { rows: roleRows } = await db.query('SELECT * FROM roles WHERE id = $1', [id]);
    if (!roleRows.length) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    const role = roleRows[0] as { name: string };

    // Update metadata if provided
    if (display_name !== undefined || description !== undefined) {
      await db.query(
        `UPDATE roles SET display_name = COALESCE($2, display_name),
                          description  = COALESCE($3, description),
                          updated_at = now()
         WHERE id = $1`,
        [id, display_name ?? null, description ?? null]
      );
    }

    // Replace the permission set if provided
    if (Array.isArray(permissions)) {
      if (role.name === 'admin') {
        return NextResponse.json(
          { error: 'The admin role always has every permission and cannot be changed.' },
          { status: 400 }
        );
      }
      await db.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
      if (permissions.length) {
        await db.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT $1, p.id FROM permissions p WHERE p.name = ANY($2::text[])
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [id, permissions]
        );
      }
    }

    const actor = await getServerSession();
    await createAuditLog({ userId: actor?.id, userEmail: actor?.email, action: 'update', resourceType: 'role', resourceId: id, newValues: { display_name, description, permissions } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Roles PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

// DELETE /api/roles?id=...
export async function DELETE(request: NextRequest) {
  const denied = await enforce('users.manage'); if (denied) return denied;
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { rows } = await db.query('SELECT * FROM roles WHERE id = $1', [id]);
    if (!rows.length) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    if (rows[0].is_system) {
      return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 400 });
    }

    const { rows: counts } = await db.query<{ c: number }>(
      'SELECT count(*)::int AS c FROM profiles WHERE role_id = $1', [id]
    );
    if (counts[0].c > 0) {
      return NextResponse.json(
        { error: `This role is assigned to ${counts[0].c} user(s). Reassign them first.` },
        { status: 409 }
      );
    }

    await db.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    await db.query('DELETE FROM roles WHERE id = $1', [id]);
    const actor = await getServerSession();
    await createAuditLog({ userId: actor?.id, userEmail: actor?.email, action: 'delete', resourceType: 'role', resourceId: id, oldValues: { name: rows[0].name } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Roles DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
