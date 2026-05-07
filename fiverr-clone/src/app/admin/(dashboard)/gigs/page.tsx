import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge, Button } from '@/components/ui';
import { GigReviewActions } from './GigReviewActions';

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default async function AdminGigsPage() {
  const supabase = await createClient();

  const { data: gigs } = await supabase
    .from('gigs')
    .select('id, title, slug, created_at, seller_user_id')
    .eq('status', 'review')
    .order('created_at', { ascending: false });

  const sellerIds = [...new Set((gigs ?? []).map((g) => g.seller_user_id))];
  const { data: profiles } = sellerIds.length > 0
    ? await supabase.from('profiles').select('user_id, display_name').in('user_id', sellerIds)
    : { data: [] };
  const profilesMap = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name ?? '—']));

  const pendingGigs = (gigs ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    slug: g.slug,
    seller: profilesMap.get(g.seller_user_id) ?? '—',
    submitted: relativeTime(new Date(g.created_at)),
  }));

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--black)' }}>
          Gig Reviews
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--gray-500)' }}>
          Review and approve or reject gigs submitted by sellers
        </p>
      </div>

      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--white)' }}>
        {pendingGigs.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: 'var(--gray-500)' }}>
            No pending reviews
          </p>
        ) : (
          <div className="space-y-4">
            {pendingGigs.map((gig) => (
              <div
                key={gig.id}
                className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                style={{ borderColor: 'var(--gray-200)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium" style={{ color: 'var(--black)' }}>
                    {gig.title}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--gray-500)' }}>
                    by {gig.seller} • {gig.submitted}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link href={`/admin/gigs/${gig.id}`}>
                    <Button variant="ghost" size="sm">
                      Review
                    </Button>
                  </Link>
                  <GigReviewActions gigId={gig.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
