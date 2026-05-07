import Link from 'next/link';
import { Search, ArrowRight, ChevronRight, Star, Clock, Shield, Zap, Play, Code2, Palette, Megaphone, PenTool, Video, Music, Cpu, Globe } from 'lucide-react';
import { GigCardHeartButton } from '@/components/gig/GigCardHeartButton';
import { NavbarClient } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { C, GFButton, GFCard, GFBadge, StarRating, GFAvatar } from '@/components/gigflow/design-system';
import { createClient } from '@/lib/supabase/server';
import { getSellerLevel } from '@/lib/seller-level';

const stats = [
  { value: '50K+', label: 'Active Sellers' },
  { value: '$12M+', label: 'Paid Out' },
  { value: '4.9', label: 'Avg Rating' },
  { value: '98%', label: 'On-time Delivery' },
];

const howItWorks = [
  { step: '01', title: 'Post a request', desc: 'Tell us what you need. Browse gigs or post a custom project for sellers to bid on.' },
  { step: '02', title: 'Choose your expert', desc: 'Review profiles, portfolios, and reviews. Message sellers before you commit.' },
  { step: '03', title: 'Get it done', desc: 'Pay securely. Your funds are held in escrow until you approve the delivery.' },
];

const popularTags = ['Web Design', 'Logo', 'WordPress', 'Video Editing', 'AI Writing'];

const CATEGORY_META: Record<string, { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string }> = {
  design: { icon: Palette, color: '#8B5CF6' },
  development: { icon: Code2, color: '#3B82F6' },
  marketing: { icon: Megaphone, color: '#10B981' },
  writing: { icon: PenTool, color: '#F59E0B' },
  video: { icon: Video, color: '#EF4444' },
  music: { icon: Music, color: '#EC4899' },
  'ai-services': { icon: Cpu, color: '#06B6D4' },
  seo: { icon: Globe, color: '#84CC16' },
};

const FALLBACK_CATEGORIES = [
  { slug: 'design', name: 'Design' },
  { slug: 'development', name: 'Development' },
  { slug: 'marketing', name: 'Marketing' },
  { slug: 'writing', name: 'Writing' },
  { slug: 'video', name: 'Video' },
  { slug: 'music', name: 'Music' },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: seller } = user
    ? await supabase.from('seller_accounts').select('id').eq('user_id', user.id).single()
    : { data: null };
  const isSeller = !!seller;
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('is_active', true)
    .order('name');

  const categoryIds = (categories || []).map((c) => c.id);
  const { data: gigCounts } = categoryIds.length
    ? await supabase.from('gigs').select('category_id').eq('status', 'published')
    : { data: [] };
  const countByCategory = new Map<string, number>();
  for (const g of gigCounts || []) {
    const cid = (g as { category_id?: string }).category_id;
    if (cid) countByCategory.set(cid, (countByCategory.get(cid) ?? 0) + 1);
  }

  const { data: gigs } = await supabase
    .from('gigs')
    .select('id, slug, title, seller_user_id, gallery, gig_packages(price_cents, delivery_days)')
    .eq('status', 'published')
    .limit(6)
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

  const { data: completedBySeller } = await supabase
    .from('orders')
    .select('seller_user_id')
    .eq('status', 'completed');
  const completedCountBySeller = new Map<string, number>();
  for (const o of completedBySeller || []) {
    completedCountBySeller.set(o.seller_user_id, (completedCountBySeller.get(o.seller_user_id) || 0) + 1);
  }

  const gigsWithProfiles = (gigs || []).map((g) => {
    const profile = profilesMap.get(g.seller_user_id);
    const packages = g.gig_packages as { price_cents: number; delivery_days?: number }[] | null;
    const gallery = (g.gallery || []) as Array<{ url?: string; type?: string }>;
    const firstImage = gallery.find((x) => x.type === 'image' || !x.type);
    const coverUrl = firstImage?.url || gallery[0]?.url;
    const minPrice = packages?.length
      ? Math.min(...packages.map((p) => p.price_cents))
      : 15000;
    const minDelivery = packages?.length
      ? Math.min(...packages.map((p) => p.delivery_days ?? 5))
      : 5;
    const { count: reviewCount, avg: avgRating } = reviewsByGig.get(g.id) ?? { count: 0, avg: 0 };
    const completed = completedCountBySeller.get(g.seller_user_id) ?? 0;
    const sellerLevel = getSellerLevel(completed);
    const badge = sellerLevel.level === 'top_rated' ? 'Top Rated' : sellerLevel.level === 'level1' || sellerLevel.level === 'level2' ? 'Pro' : null;
    return {
      ...g,
      coverUrl,
      sellerName: profile?.display_name || profile?.username || 'Seller',
      sellerAvatarUrl: profile?.avatar_url,
      sellerDisplayName: profile?.display_name || profile?.username,
      minPrice: minPrice / 100,
      deliveryDays: minDelivery,
      reviewCount,
      avgRating: reviewCount > 0 ? avgRating : null,
      badge,
    };
  });

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: C.white }}>
      <NavbarClient user={user} />
      <div className="flex-1">
      {/* Hero */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle, ${C.brand}, transparent)` }} />
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border text-sm font-medium" style={{ borderColor: C.border, color: C.muted, backgroundColor: C.surface }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: C.brand }} />
              Trusted by 50,000+ freelancers worldwide
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6 text-balance" style={{ color: C.ink }}>
              Find talent that<br />
              <span style={{ color: C.brand }}>delivers.</span>
            </h1>

            <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed" style={{ color: C.muted }}>
              Connect with world-class freelancers. Secure payments. Exceptional work, on time — every time.
            </p>

            <form action="/search" method="get" className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 p-2 rounded-2xl max-w-2xl mb-6 border" style={{ backgroundColor: C.surface, borderColor: C.border }}>
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <Search size={20} className="ml-1 sm:ml-3 flex-shrink-0" style={{ color: C.muted }} />
                <input
                  name="q"
                  placeholder='Try "logo design" or "React developer"'
                  className="flex-1 min-w-0 bg-transparent py-3 px-2 text-base focus:outline-none"
                  style={{ color: C.ink }}
                />
              </div>
              <GFButton type="submit" size="md" icon={<ArrowRight size={16} />} className="min-h-[44px] w-full sm:w-auto">
                Search
              </GFButton>
            </form>

            <div className="flex items-center flex-wrap gap-2">
              <span className="text-sm" style={{ color: C.muted }}>Popular:</span>
              {popularTags.map((tag) => (
                <Link
                  key={tag}
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  className="px-4 py-1.5 rounded-full text-sm border hover:border-orange-300 hover:text-orange-600 transition-all"
                  style={{ borderColor: C.border, color: C.muted, backgroundColor: C.white }}
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-6 sm:gap-12 mt-20 pt-10 border-t" style={{ borderColor: C.border }}>
            {stats.map((s, i) => (
              <div key={i}>
                <div className="text-3xl font-bold tracking-tight" style={{ color: C.ink }}>{s.value}</div>
                <div className="text-sm mt-0.5 font-medium" style={{ color: C.muted }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-4 sm:px-6" style={{ backgroundColor: C.surface }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: C.brand }}>Browse by category</p>
              <h2 className="text-3xl font-bold tracking-tight" style={{ color: C.ink }}>Every skill you need</h2>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 font-semibold px-4 py-2 text-sm rounded-xl hover:bg-black/5 transition-all"
            >
              View all <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
            {(categories || []).map((cat, idx) => {
              const meta = CATEGORY_META[cat.slug?.toLowerCase() || ''] ?? { icon: Zap, color: C.brand };
              const IconComponent = meta.icon;
              const count = cat.id ? (countByCategory.get(cat.id) ?? 0) : 0;
              const countStr = count >= 1000 ? `${(count / 1000).toFixed(1)}K` : String(count);
              return (
                <Link
                  key={cat.id ?? cat.slug ?? idx}
                  href={`/categories/${cat.slug}`}
                  className="group flex flex-col items-center gap-3 p-4 rounded-2xl border text-center transition-all hover:shadow-md hover:-translate-y-0.5"
                  style={{ backgroundColor: C.white, borderColor: C.border }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 flex-shrink-0"
                    style={{ backgroundColor: `${meta.color}18` }}
                  >
                    <IconComponent size={20} style={{ color: meta.color }} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: C.ink }}>{cat.name}</div>
                    <div className="text-xs mt-0.5 font-mono" style={{ color: C.muted }}>{countStr} gigs</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Gigs */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: C.brand }}>Trending this week</p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: C.ink }}>Top picks for you</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {gigsWithProfiles.slice(0, 3).map((gig) => (
              <Link key={gig.id} href={`/g/${gig.slug}`} className="block">
                <GFCard hover className="group overflow-hidden">
                  <div className="aspect-[16/9] overflow-hidden relative" style={{ backgroundColor: C.surfaceAlt }}>
                    {gig.coverUrl ? (
                      <img src={gig.coverUrl} alt={gig.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-50" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    {gig.badge && (
                      <div className="absolute top-3 left-3">
                        <GFBadge variant={gig.badge === 'Pro' ? 'dark' : 'brand'}>{gig.badge}</GFBadge>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <GigCardHeartButton gigId={gig.id} />
                      <div className="opacity-0 group-hover:opacity-100 transition-all pointer-events-none w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}>
                        <Play size={14} style={{ color: C.ink }} />
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <GFAvatar src={gig.sellerAvatarUrl} name={gig.sellerDisplayName} size="sm" />
                      <span className="text-sm font-medium" style={{ color: C.muted }}>{gig.sellerName}</span>
                    </div>
                    <h3 className="font-semibold text-sm leading-snug mb-3 line-clamp-2" style={{ color: C.ink }}>{gig.title}</h3>
                    <div className="flex items-center gap-3 mb-4">
                      {gig.reviewCount > 0 && gig.avgRating ? (
                        <StarRating rating={gig.avgRating} count={gig.reviewCount} size={12} />
                      ) : (
                        <span className="text-sm" style={{ color: C.muted }}>No reviews yet</span>
                      )}
                      <span className="text-xs flex items-center gap-1" style={{ color: C.muted }}>
                        <Clock size={12} />{gig.deliveryDays} days
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: C.border }}>
                      <span className="text-xs uppercase tracking-wide font-medium" style={{ color: C.muted }}>From</span>
                      <span className="text-lg font-bold" style={{ color: C.ink }}>${gig.minPrice}</span>
                    </div>
                  </div>
                </GFCard>
              </Link>
            ))}
            {gigsWithProfiles.length === 0 && (
              <div className="col-span-3 rounded-2xl p-12 text-center border" style={{ backgroundColor: C.surface, borderColor: C.border }}>
                <p style={{ color: C.muted }}>No gigs yet. Be the first to list a service!</p>
                <Link href={isSeller ? '/sell/gigs/new' : '/login?signup=1&next=/sell/onboarding'} className="mt-4 inline-block">
                  <GFButton variant="brand" size="sm">{isSeller ? 'Create gig' : 'Become a Seller'}</GFButton>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6" style={{ backgroundColor: C.surface }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: C.brand }}>Simple process</p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: C.ink }}>How gigflow works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, i) => (
              <div key={i} className="relative">
                <div className="text-5xl font-bold font-mono mb-4" style={{ color: `${C.brand}20` }}>{step.step}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: C.ink }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{step.desc}</p>
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-8 right-0 translate-x-1/2">
                    <ChevronRight size={20} style={{ color: C.border }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Secure payments', desc: 'Funds held in escrow. Released only when you approve the work.' },
              { icon: Star, title: 'Vetted sellers', desc: 'Every seller is reviewed and rated by real buyers, with quality scores.' },
              { icon: Zap, title: 'Fast delivery', desc: 'Get work done in 24 hours or less with our express service options.' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: C.brandMuted }}>
                  <f.icon size={18} style={{ color: C.brand }} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: C.ink }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 mb-4">
        <div
          className="max-w-5xl mx-auto text-center rounded-3xl px-6 sm:px-8 py-12 sm:py-16 bg-[#0A0A0A]"
          style={{ backgroundColor: C.black }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 text-white">Ready to get started?</h2>
          <p className="text-base sm:text-lg mb-8 max-w-md mx-auto text-white/70">
            Join 50,000+ freelancers and businesses. First order free of platform fees.
          </p>
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-6 sm:px-7 py-3.5 rounded-xl text-base font-semibold transition-all hover:shadow-md active:scale-[0.98] min-h-[48px] text-white hover:opacity-95"
              style={{ background: `linear-gradient(135deg, ${C.brandLight}, ${C.brand})`, color: 'white' }}
            >
              Find Talent
            </Link>
            <Link
              href={isSeller ? '/sell/dashboard' : '/login?signup=1&next=/sell/onboarding'}
              className="inline-flex items-center justify-center px-6 sm:px-7 py-3.5 rounded-xl text-base font-semibold border-2 border-white/60 text-white bg-white/5 hover:bg-white/10 transition-all min-h-[48px]"
            >
              Become a Seller
            </Link>
          </div>
        </div>
      </section>

      </div>
      <Footer />
    </div>
  );
}
