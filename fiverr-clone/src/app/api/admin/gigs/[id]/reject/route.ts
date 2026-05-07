import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: gig } = await supabase
    .from('gigs')
    .select('id, status')
    .eq('id', id)
    .single();

  if (!gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('gigs')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Admin reject gig error:', error);
    return NextResponse.json({ error: 'Failed to reject gig' }, { status: 500 });
  }

  await supabase.from('admin_actions').insert({
    admin_user_id: user.id,
    action: 'gig_rejected',
    target_type: 'gig',
    target_id: id,
  });

  return NextResponse.json({ ok: true });
}
