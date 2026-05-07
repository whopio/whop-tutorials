import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ favorited: false, ids: [] });
    }

    const { searchParams } = new URL(request.url);
    const gigId = searchParams.get('gigId');
    if (gigId) {
      const { data } = await supabase
        .from('user_favorites')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('gig_id', gigId)
        .single();
      return NextResponse.json({ favorited: !!data });
    }

    const { data: rows } = await supabase
      .from('user_favorites')
      .select('gig_id')
      .eq('user_id', user.id);
    const ids = (rows || []).map((r) => r.gig_id);
    return NextResponse.json({ ids });
  } catch (err) {
    console.error('[favorites check]', err);
    return NextResponse.json({ favorited: false, ids: [] });
  }
}
