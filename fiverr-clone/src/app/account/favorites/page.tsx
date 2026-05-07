import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { NavAccount } from '@/components/layout/NavAccount';
import { Footer } from '@/components/layout/Footer';
import { GigCardHeartButton } from '@/components/gig/GigCardHeartButton';
import { StarRating } from '@/components/gigflow/design-system';
import { C } from '@/lib/design-tokens';
import { createClient } from '@/lib/supabase/server';

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/account/favorites');
  }

  const { data: favs } = await supabase
    .from('user_favorites')
    .select('gig_id')
    .eq('user_id', user.id);

  const gigIds = (favs || []).map((f) => f.gig_id);
  const { data: gigs } = gigIds.length
    ? await supabase
        .from('gigs')
        .select(`
          id,
          slug,
          title,
          gallery,
          seller_user_id,
          gig_packages(price_cents)
        `)
        .in('id', gigIds)
        .eq('status', 'published')
    : { data: [] };

  const sellerIds = [...new Set((gigs || []).map((g) => g.seller_user_id))];
  const { data: profiles } = sellerIds.length
    ? await supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', sellerIds)
    : { data: [] };
  const profilesMap = new Map((profiles || []).map((p) => [p.user_id, p]));

  const { data: reviewsData } = gigIds.length
    ? await supabase.from('reviews').select('gig_id, rating').in('gig_id', gigIds)
    : { data: [] };
  const reviewsByGig = new Map<string, { count: number; avg: number }>();
  for (const gid of gigIds) {
    const gigReviews = (reviewsData || []).filter((r) => r.gig_id === gid);
    const count = gigReviews.length;
    const avg = count > 0 ? gigReviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    reviewsByGig.set(gid, { count, avg });
  }

  const gigsWithMeta = (gigs || []).map((g) => {
    const profile = profilesMap.get(g.seller_user_id);
    const packages = g.gig_packages as { price_cents: number }[] | null;
    const gallery = (g.gallery || []) as Array<{ url?: string; type?: string }>;
    const firstImage = gallery.find((x) => x.type === 'image' || !x.type);
    const coverUrl = firstImage?.url || gallery[0]?.url;
    const { count: reviewCount, avg: avgRating } = reviewsByGig.get(g.id) ?? { count: 0, avg: 0 };
    return {
      ...g,
      coverUrl,
      sellerName: profile?.display_name || profile?.username || 'Seller',
      minPrice: packages?.length ? Math.min(...packages.map((p) => p.price_cents)) / 100 : 0,
      reviewCount,
      avgRating: reviewCount > 0 ? avgRating : null,
    };
  });

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: C.surface }}>
      <NavAccount />
      <div className="flex-1 mx-auto w-full max-w-5xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold" style={{ color: C.ink }}>
          Saved services
        </h1>
        {gigsWithMeta.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gigsWithMeta.map((gig) => (
              <Link
                key={gig.id}
                href={`/g/${gig.slug}`}
                className="group relative overflow-hidden rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ backgroundColor: C.white, borderColor: C.border }}
              >
                <div className="absolute right-3 top-3 z-10">
                  <GigCardHeartButton gigId={gig.id} inline />
                </div>
                <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: C.surface }}>
                  {gig.coverUrl ? (
                    <Image
                      src={gig.coverUrl}
                      alt={gig.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${C.brandMuted}, rgba(255,107,0,0.2))` }} />
                  )}
                </div>
                <div className="p-4">
                  <p className="mb-2 text-xs font-medium" style={{ color: C.muted }}>
                    {gig.sellerName}
                  </p>
                  <h3 className="mb-2 line-clamp-2 text-sm font-semibold" style={{ color: C.ink }}>
                    {gig.title}
                  </h3>
                  <div className="mb-2">
                    {gig.reviewCount > 0 ? (
                      <StarRating rating={gig.avgRating!} count={gig.reviewCount} size={12} />
                    ) : (
                      <span className="text-xs" style={{ color: C.muted }}>No reviews</span>
                    )}
                  </div>
                  <p className="text-sm font-bold" style={{ color: C.ink }}>
                    From ${gig.minPrice}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border py-16 text-center"
            style={{ backgroundColor: C.white, borderColor: C.border }}
          >
            <Heart size={48} className="mb-4" style={{ color: C.subtle }} />
            <p className="text-lg font-medium" style={{ color: C.muted }}>
              No saved services yet
            </p>
            <p className="mt-2 text-sm" style={{ color: C.muted }}>
              Save gigs you like by clicking the heart icon
            </p>
            <Link
              href="/search"
              className="mt-4 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
              style={{ background: `linear-gradient(135deg, ${C.brandLight}, ${C.brand})` }}
            >
              Browse services
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
