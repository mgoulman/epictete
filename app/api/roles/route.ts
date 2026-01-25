import { NextResponse } from 'next/server';
import { createSupabaseServerClient, requireAuth } from '@/lib/auth/supabase-server';

// GET /api/roles - List all roles
export async function GET() {
  try {
    await requireAuth();

    const supabase = await createSupabaseServerClient();

    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ roles });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
