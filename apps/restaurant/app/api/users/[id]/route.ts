import { NextResponse } from 'next/server';
import { createSupabaseServerClient, requirePermission } from '@/lib/auth/supabase-server';
import { createAuditLog, getRequestMeta } from '@/lib/auth/audit';

// GET /api/users/[id] - Get single user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('users.manage');

    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        role:roles(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: profile });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (err.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/users/[id] - Update user
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requirePermission('users.manage');

    const { id } = await params;
    const updates = await request.json();

    const supabase = await createSupabaseServerClient();

    // Get current profile for audit
    const { data: oldProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    // Only allow updating specific fields
    const allowedFields = ['full_name', 'avatar_url', 'role_id', 'is_active'];
    const filteredUpdates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(filteredUpdates)
      .eq('id', id)
      .select(`
        *,
        role:roles(*)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create audit log
    const meta = getRequestMeta(request);
    await createAuditLog({
      userId: currentUser.id,
      userEmail: currentUser.email,
      action: 'update',
      resourceType: 'user',
      resourceId: id,
      oldValues: oldProfile,
      newValues: filteredUpdates,
      ...meta
    });

    return NextResponse.json({ user: profile });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (err.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Deactivate user (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requirePermission('users.manage');

    const { id } = await params;

    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Get current profile for audit
    const { data: oldProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    // Soft delete by deactivating
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create audit log
    const meta = getRequestMeta(request);
    await createAuditLog({
      userId: currentUser.id,
      userEmail: currentUser.email,
      action: 'delete',
      resourceType: 'user',
      resourceId: id,
      oldValues: oldProfile,
      newValues: { is_active: false },
      ...meta
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (err.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
