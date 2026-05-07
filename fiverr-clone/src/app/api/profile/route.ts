import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Username: 3-30 chars, lowercase letters, numbers, underscores, hyphens
const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/;

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { display_name, username, bio, skills, location, website, tagline, portfolio } = body;

  const updates: Record<string, unknown> = {};
  if (display_name !== undefined) {
    const v = String(display_name).trim();
    if (v.length > 100) {
      return NextResponse.json({ error: 'Display name too long' }, { status: 400 });
    }
    updates.display_name = v || null;
  }

  if (username !== undefined) {
    const v = String(username).trim().toLowerCase();
    if (!v) {
      updates.username = null;
    } else {
      if (!USERNAME_REGEX.test(v)) {
        return NextResponse.json(
          { error: 'Username must be 3–30 characters: letters, numbers, underscores, or hyphens' },
          { status: 400 }
        );
      }
      const { data: existing } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', v)
        .single();
      if (existing && existing.user_id !== user.id) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
      }
      updates.username = v;
    }
  }

  if (bio !== undefined) {
    const v = typeof bio === 'string' ? bio.trim() : '';
    if (v.length > 2000) {
      return NextResponse.json({ error: 'About me is too long (max 2000 characters)' }, { status: 400 });
    }
    updates.bio = v || null;
  }

  if (skills !== undefined) {
    const arr = Array.isArray(skills)
      ? skills.map((s) => String(s).trim()).filter(Boolean)
      : typeof skills === 'string'
        ? skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    if (arr.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 skills' }, { status: 400 });
    }
    updates.skills = arr;
  }

  if (location !== undefined) {
    const v = typeof location === 'string' ? location.trim() : '';
    if (v.length > 120) {
      return NextResponse.json({ error: 'Location is too long (max 120 characters)' }, { status: 400 });
    }
    updates.location = v || null;
  }

  if (website !== undefined) {
    let v = typeof website === 'string' ? website.trim() : '';
    if (v.length > 500) {
      return NextResponse.json({ error: 'Website URL is too long' }, { status: 400 });
    }
    if (v && !/^https?:\/\//i.test(v) && !/^mailto:/i.test(v)) {
      v = `https://${v}`;
    }
    updates.website = v || null;
  }

  if (tagline !== undefined) {
    const v = typeof tagline === 'string' ? tagline.trim() : '';
    if (v.length > 160) {
      return NextResponse.json({ error: 'Tagline is too long (max 160 characters)' }, { status: 400 });
    }
    updates.tagline = v || null;
  }

  if (portfolio !== undefined) {
    if (!Array.isArray(portfolio)) {
      return NextResponse.json({ error: 'Portfolio must be an array' }, { status: 400 });
    }
    if (portfolio.length > 12) {
      return NextResponse.json({ error: 'Maximum 12 portfolio items' }, { status: 400 });
    }
    const cleaned: Array<{ id: string; title: string; image_url: string; url?: string }> = [];
    for (const raw of portfolio) {
      if (!raw || typeof raw !== 'object') continue;
      const o = raw as Record<string, unknown>;
      const id = String(o.id || '').trim().slice(0, 80);
      const title = String(o.title || '').trim().slice(0, 200);
      const image_url = String(o.image_url || '').trim().slice(0, 2000);
      if (!id || !image_url) continue;
      const url = o.url != null ? String(o.url).trim().slice(0, 500) : '';
      const item: { id: string; title: string; image_url: string; url?: string } = { id, title, image_url };
      if (url) {
        if (!/^https?:\/\//i.test(url)) {
          return NextResponse.json({ error: 'Each portfolio link must start with http:// or https://' }, { status: 400 });
        }
        item.url = url;
      }
      cleaned.push(item);
    }
    updates.portfolio = cleaned;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', user.id);

  if (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
