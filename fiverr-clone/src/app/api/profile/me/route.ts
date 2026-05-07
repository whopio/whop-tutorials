import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [{ data: profile }, { data: seller }] = await Promise.all([
    supabase.from('profiles').select('avatar_url, display_name, username').eq('user_id', user.id).single(),
    supabase.from('seller_accounts').select('id').eq('user_id', user.id).single(),
  ]);

  return NextResponse.json({
    avatar_url: profile?.avatar_url ?? null,
    display_name: profile?.display_name ?? null,
    username: profile?.username ?? null,
    email: user.email ?? null,
    isSeller: !!seller,
  });
}
