import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const BUCKET = 'avatars';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB for portfolio shots
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file || !file.size) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid type. Use JPEG, PNG, GIF, or WebP.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${user.id}/portfolio/${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error('Portfolio upload error:', uploadError);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const url = urlData.publicUrl;

  return NextResponse.json({ url });
}
