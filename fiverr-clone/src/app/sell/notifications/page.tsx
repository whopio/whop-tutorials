import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Bell, MessageSquare, Package, Star } from 'lucide-react';
import { NavAccount } from '@/components/layout/NavAccount';
import { Footer } from '@/components/layout/Footer';
import { MarkAllReadButton } from '@/components/notifications/MarkAllReadButton';
import { C } from '@/lib/design-tokens';
import { createClient } from '@/lib/supabase/server';

export default async function SellNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/sell/notifications');
  }

  const { data: seller } = await supabase
    .from('seller_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!seller) {
    redirect('/sell/onboarding');
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const unreadCount = (notifications || []).filter((n) => !n.read_at).length;

  const iconByType: Record<string, React.ReactNode> = {
    message: <MessageSquare size={18} />,
    order: <Package size={18} />,
    review: <Star size={18} />,
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: C.surface }}>
      <NavAccount />
      <div className="flex-1 mx-auto w-full max-w-2xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: C.ink }}>
            Notifications
          </h1>
          <MarkAllReadButton
            unreadCount={unreadCount}
            className="text-sm font-medium hover:underline"
          />
        </div>
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: C.white, borderColor: C.border }}>
          {notifications && notifications.length > 0 ? (
            <ul className="divide-y" style={{ borderColor: C.border }}>
              {notifications.map((n) => {
                const Wrapper = n.link ? Link : 'div';
                return (
                  <li key={n.id}>
                    <Wrapper
                      href={n.link || '#'}
                      className={`flex gap-4 p-4 transition-colors hover:bg-black/[0.02] ${
                        !n.read_at ? 'opacity-100' : 'opacity-90'
                      }`}
                      style={!n.read_at ? { backgroundColor: C.brandMuted } : {}}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: n.read_at ? C.surface : C.brand,
                          color: n.read_at ? C.muted : C.white,
                        }}
                      >
                        {iconByType[n.type] || <Bell size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={!n.read_at ? 'font-semibold' : 'font-medium'}
                          style={{ color: C.ink }}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 text-sm" style={{ color: C.muted }}>
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 text-xs" style={{ color: C.muted }}>
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    </Wrapper>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell size={48} className="mb-4" style={{ color: C.subtle }} />
              <p className="text-lg font-medium" style={{ color: C.muted }}>
                No notifications yet
              </p>
              <p className="mt-2 text-sm" style={{ color: C.muted }}>
                When you get messages or order updates, they&apos;ll appear here.
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
