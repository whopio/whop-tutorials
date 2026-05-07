import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const BUCKET = 'gig-media';
const MAX_IMAGE = 5 * 1024 * 1024;   // 5MB
const MAX_VIDEO = 50 * 1024 * 1024; // 50MB
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: seller } = await supabase
    .from('seller_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!seller) {
    return NextResponse.json({ error: 'Not a seller' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file || !file.size) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: 'Invalid type. Use JPEG, PNG, GIF, WebP for images or MP4, WebM for videos.' },
      { status: 400 }
    );
  }

  const maxSize = isImage ? MAX_IMAGE : MAX_VIDEO;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: isImage ? 'Image too large (max 5MB)' : 'Video too large (max 50MB)' },
      { status: 400 }
    );
  }

  const ext = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
  const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const path = `${user.id}/${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type });

  if (uploadError) {
    console.error('Gig media upload error:', uploadError);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = `${urlData.publicUrl}?t=${Date.now()}`;
  const type = isImage ? 'image' as const : 'video' as const;

  return NextResponse.json({ url, type });
}
