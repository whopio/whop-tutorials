import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gigId } = body as { gigId?: string };
    if (!gigId) {
      return NextResponse.json({ error: 'Missing gigId' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('user_favorites')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('gig_id', gigId)
      .single();

    if (existing) {
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('gig_id', gigId);
      return NextResponse.json({ favorited: false });
    }

    await supabase.from('user_favorites').insert({
      user_id: user.id,
      gig_id: gigId,
    });
    return NextResponse.json({ favorited: true });
  } catch (err) {
    console.error('[favorites toggle]', err);
    return NextResponse.json({ error: 'Failed to toggle favorite' }, { status: 500 });
  }
}
