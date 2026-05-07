import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getAppBaseUrl } from '@/lib/app-url';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { searchParams } = new URL(request.url);
  const next = searchParams.get('next');
  const base = getAppBaseUrl();
  const redirectUrl = next && next.startsWith('/') ? `${base}${next}` : `${base}/`;
  return NextResponse.redirect(new URL(redirectUrl));
}

export async function POST(request: NextRequest) {
  return GET(request);
}
