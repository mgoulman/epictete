import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import db from '@/lib/db';

// GET - Fetch site content (public, no auth needed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');

    let query = db.from('site_content').select('*');
    if (section) query = query.eq('section', section);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Site content GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch site content' }, { status: 500 });
  }
}

// PATCH - Update a section's content (requires auth)
export async function PATCH(request: NextRequest) {
  try {
    const serverSupabase = await createSupabaseServerClient();

    // Verify auth
    const { data: { user }, error: authError } = await serverSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { section, content } = body;

    if (!section) {
      return NextResponse.json({ error: 'Section is required' }, { status: 400 });
    }

    const { data, error } = await serverSupabase
      .from('site_content')
      .update({
        content,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('section', section)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Site content PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update site content' }, { status: 500 });
  }
}
