import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }

  const unreadCount = (data || []).filter((n) => !n.read_at).length;

  return NextResponse.json({ notifications: data || [], unreadCount });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { markAllRead, notificationId } = body;

  if (markAllRead) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) {
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
