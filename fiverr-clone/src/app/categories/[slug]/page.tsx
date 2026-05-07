import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { NavbarClient } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { GigCardHeartButton } from '@/components/gig/GigCardHeartButton';
import { GFAvatar, StarRating } from '@/components/gigflow/design-system';
import { C } from '@/lib/design-tokens';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!category) notFound();

  const { data: gigs } = await supabase
    .from('gigs')
    .select('id, slug, title, gallery, seller_user_id, gig_packages(price_cents)')
    .eq('category_id', category.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  const sellerIds = [...new Set((gigs || []).map((g) => g.seller_user_id))];
  const { data: profilesData } = sellerIds.length
    ? await supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', sellerIds)
    : { data: [] };
  const profilesMap = new Map((profilesData || []).map((p) => [p.user_id, p]));

  const gigIds = (gigs || []).map((g) => g.id);
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
    const gallery = ((g as { gallery?: Array<{ url?: string; type?: string }> }).gallery || []) as Array<{ url?: string; type?: string }>;
    const firstImage = gallery.find((x) => x.type === 'image' || !x.type);
    const coverUrl = firstImage?.url || gallery[0]?.url;
    const minPrice = packages?.length ? Math.min(...packages.map((p) => p.price_cents)) : 0;
    const { count: reviewCount, avg: avgRating } = reviewsByGig.get(g.id) ?? { count: 0, avg: 0 };
    return {
      ...g,
      coverUrl: coverUrl || null,
      sellerName: profile?.display_name || profile?.username || 'Seller',
      sellerAvatarUrl: profile?.avatar_url,
      sellerDisplayName: profile?.display_name || profile?.username,
      minPrice: minPrice / 100,
      reviewCount,
      avgRating: reviewCount > 0 ? avgRating : null,
    };
  });

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: C.surface }}>
      <NavbarClient />
      <div className="flex-1 mx-auto w-full max-w-5xl px-6 pt-[72px] sm:pt-20 pb-8">
        <h1 className="mb-2 text-2xl font-bold" style={{ color: C.ink }}>
          {category.name}
        </h1>
        <p className="mb-8 text-sm" style={{ color: C.muted }}>
          {gigsWithMeta.length} services available
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {gigsWithMeta.map((gig) => (
            <Link
              key={gig.id}
              href={`/g/${gig.slug}`}
              className="group relative overflow-hidden rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{ backgroundColor: C.white, borderColor: C.border }}
            >
              <div className="absolute right-4 top-4 z-10">
                <GigCardHeartButton gigId={gig.id} inline />
              </div>
              <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: C.surface }}>
                {gig.coverUrl ? (
                  <Image
                    src={gig.coverUrl}
                    alt={gig.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${C.brandMuted}, rgba(255,107,0,0.2))` }} />
                )}
              </div>
              <div className="p-5">
                <div className="mb-3 flex items-center gap-3">
                  <GFAvatar src={gig.sellerAvatarUrl} name={gig.sellerDisplayName} size="sm" />
                  <span className="text-sm font-medium" style={{ color: C.muted }}>{gig.sellerName}</span>
                </div>
                <h3 className="mb-3 line-clamp-2 font-semibold" style={{ color: C.ink }}>{gig.title}</h3>
                <div className="mb-4">
                  {gig.reviewCount > 0 ? (
                    <StarRating rating={gig.avgRating!} count={gig.reviewCount} size={14} />
                  ) : (
                    <span className="text-sm" style={{ color: C.muted }}>No reviews yet</span>
                  )}
                </div>
                <div className="flex justify-between border-t pt-4" style={{ borderColor: C.border }}>
                  <span className="text-xs uppercase tracking-wide" style={{ color: C.muted }}>From</span>
                  <span className="text-xl font-bold" style={{ color: C.ink }}>${gig.minPrice}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
