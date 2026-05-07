import { NavbarClient } from '@/components/layout/Navbar';
import { C } from '@/lib/design-tokens';
import { Footer } from '@/components/layout/Footer';
import { SearchContent } from '@/components/search/SearchContent';
import { createClient } from '@/lib/supabase/server';
import { getSellerLevel } from '@/lib/seller-level';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    budget?: string;
    delivery?: string;
    min_rating?: string;
  }>;
}) {
  const { q, category: categorySlug, sort, budget, delivery, min_rating } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('gigs')
    .select('id, slug, title, seller_user_id, category_id, gallery, created_at, gig_packages(price_cents, delivery_days, tier)')
    .eq('status', 'published');

  if (q?.trim()) {
    const term = q.trim().replace(/%/g, '\\%');
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }

  if (categorySlug && categorySlug !== 'All') {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug.toLowerCase()).single();
    if (cat) query = query.eq('category_id', cat.id);
  }

  query = query.order('created_at', { ascending: false });
  const { data: gigs } = await query.limit(100);
  const { data: dbCategories } = await supabase
    .from('categories')
    .select('slug, name')
    .eq('is_active', true);
  const categories = (dbCategories || []).map((c) => ({ slug: c.slug, name: c.name }));

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

  const { data: completedBySeller } = await supabase
    .from('orders')
    .select('seller_user_id')
    .eq('status', 'completed');
  const completedCountBySeller = new Map<string, number>();
  for (const o of completedBySeller || []) {
    completedCountBySeller.set(o.seller_user_id, (completedCountBySeller.get(o.seller_user_id) || 0) + 1);
  }

  let gigsWithMeta = (gigs || []).map((g) => {
    const profile = profilesMap.get(g.seller_user_id);
    const packages = g.gig_packages as { price_cents: number; delivery_days?: number }[] | null;
    const gallery = (g.gallery || []) as Array<{ url?: string; type?: string }>;
    const firstImage = gallery.find((x) => x.type === 'image' || !x.type);
    const coverUrl = firstImage?.url || gallery[0]?.url;
    const minPrice = packages?.length
      ? Math.min(...packages.map((p) => p.price_cents))
      : 0;
    const minDelivery = packages?.length
      ? Math.min(...packages.map((p) => p.delivery_days ?? 5))
      : 5;
    const { count: reviewCount, avg: avgRating } = reviewsByGig.get(g.id) ?? { count: 0, avg: 0 };
    const completed = completedCountBySeller.get(g.seller_user_id) ?? 0;
    const sellerLevel = getSellerLevel(completed);
    const badge = sellerLevel.level === 'top_rated' ? 'Top Rated' : sellerLevel.level === 'level1' || sellerLevel.level === 'level2' ? 'Pro' : null;
    return {
      ...g,
      coverUrl: coverUrl || null,
      sellerName: profile?.display_name || profile?.username || 'Seller',
      sellerAvatarUrl: profile?.avatar_url,
      sellerDisplayName: profile?.display_name || profile?.username,
      minPrice: minPrice / 100,
      deliveryDays: minDelivery,
      badge,
      reviewCount,
      avgRating: reviewCount > 0 ? avgRating : null,
    };
  });

  // Apply filters (budget, delivery, min rating)
  if (budget) {
    const [maxPrice] =
      budget === 'under50' ? [50] :
      budget === '50-100' ? [100] :
      budget === '100-500' ? [500] :
      budget === '500plus' ? [Infinity] : [Infinity];
    const minForRange = budget === 'under50' ? 0 : budget === '50-100' ? 50 : budget === '100-500' ? 100 : 500;
    gigsWithMeta = gigsWithMeta.filter((g) => g.minPrice >= minForRange && g.minPrice < maxPrice);
  }
  if (delivery && delivery !== 'any') {
    const maxDays = delivery === 'express' ? 1 : delivery === '3' ? 3 : delivery === '7' ? 7 : 999;
    gigsWithMeta = gigsWithMeta.filter((g) => g.deliveryDays <= maxDays);
  }
  if (min_rating) {
    const minR = parseFloat(min_rating);
    if (!Number.isNaN(minR)) {
      gigsWithMeta = gigsWithMeta.filter((g) => (g.avgRating ?? 0) >= minR);
    }
  }

  // Apply sort (price and top_rated need in-memory sort; newest is already DB order)
  if (sort === 'price_asc') {
    gigsWithMeta = [...gigsWithMeta].sort((a, b) => a.minPrice - b.minPrice);
  } else if (sort === 'price_desc') {
    gigsWithMeta = [...gigsWithMeta].sort((a, b) => b.minPrice - a.minPrice);
  } else if (sort === 'top_rated') {
    gigsWithMeta = [...gigsWithMeta].sort((a, b) => {
      const scoreA = (a.avgRating ?? 0) * Math.log1p(a.reviewCount);
      const scoreB = (b.avgRating ?? 0) * Math.log1p(b.reviewCount);
      return scoreB - scoreA;
    });
  }
  gigsWithMeta = gigsWithMeta.slice(0, 24);

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: C.surface }}>
      <NavbarClient />
      <div className="flex-1 pt-[72px] sm:pt-20">
        <SearchContent
          gigs={gigsWithMeta}
          categories={categories}
          categorySlug={categorySlug || null}
          sort={sort}
          q={q}
          budget={budget || null}
          delivery={delivery || null}
          minRating={min_rating || null}
        />
      </div>
      <Footer />
    </div>
  );
}
