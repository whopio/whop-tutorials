import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Globe, MapPin, Send, Star } from 'lucide-react';
import { NavbarClient } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { GigCardHeartButton } from '@/components/gig/GigCardHeartButton';
import { GFAvatar, GFBadge, StarRating } from '@/components/gigflow/design-system';
import { C } from '@/lib/design-tokens';
import { createClient } from '@/lib/supabase/server';
import { getSellerLevel } from '@/lib/seller-level';

const ABOUT_TRUNCATE = 280;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PublicPortfolioItem = { id: string; title: string; image_url: string; url?: string };

function parsePortfolio(raw: unknown): PublicPortfolioItem[] {
  if (!Array.isArray(raw)) return [];
  const out: PublicPortfolioItem[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const id = String(o.id || '').trim();
    const image_url = String(o.image_url || '').trim();
    if (!id || !image_url) continue;
    const title = String(o.title || '').trim();
    const url = o.url != null ? String(o.url).trim() : '';
    out.push(url ? { id, title, image_url, url } : { id, title, image_url });
  }
  return out;
}

function externalHref(url: string): string {
  if (!url) return '#';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export default async function SellerProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username: identifier } = await params;
  const supabase = await createClient();

  const isUserId = UUID_REGEX.test(identifier);
  const { data: profile } = isUserId
    ? await supabase
        .from('profiles')
        .select(
          'user_id, display_name, username, avatar_url, bio, skills, tagline, location, website, portfolio'
        )
        .eq('user_id', identifier)
        .single()
    : await supabase
        .from('profiles')
        .select(
          'user_id, display_name, username, avatar_url, bio, skills, tagline, location, website, portfolio'
        )
        .eq('username', identifier)
        .single();

  if (!profile) notFound();

  const { data: gigs } = await supabase
    .from('gigs')
    .select(`
      id,
      slug,
      title,
      description,
      gallery,
      category_id,
      gig_packages(price_cents),
      categories(name)
    `)
    .eq('seller_user_id', profile.user_id)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  const gigsWithPrice = (gigs || []).map((g) => {
    const packages = g.gig_packages as { price_cents: number }[] | null;
    const minPrice = packages?.length ? Math.min(...packages.map((p) => p.price_cents)) : 0;
    const gallery = (g.gallery || []) as Array<{ url?: string; type?: string }>;
    const firstImage = gallery.find((x) => x.type === 'image' || !x.type);
    const coverUrl = firstImage?.url || gallery[0]?.url;
    const catData = g.categories as { name: string }[] | { name: string } | null;
    const category = Array.isArray(catData) ? catData[0] ?? null : catData;
    return {
      ...g,
      minPrice: minPrice / 100,
      coverUrl: coverUrl || null,
      categoryName: category?.name || null,
    };
  });

  const gigIds = gigsWithPrice.map((g) => g.id);

  const [completedRes, reviewsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_user_id', profile.user_id)
      .eq('status', 'completed'),
    gigIds.length > 0
      ? supabase.from('reviews').select('rating').in('gig_id', gigIds)
      : { data: [] as { rating: number }[] },
  ]);

  const completedCount = completedRes.count ?? 0;
  const sellerLevel = getSellerLevel(completedCount);
  const allReviews = reviewsRes.data ?? [];
  const reviewCount = allReviews.length;
  const avgRating =
    reviewCount > 0
      ? allReviews.reduce((s, r) => s + r.rating, 0) / reviewCount
      : null;

  const profileTagline = typeof profile.tagline === 'string' ? profile.tagline.trim() : '';
  const profileLocation = typeof profile.location === 'string' ? profile.location.trim() : '';
  const profileWebsite = typeof profile.website === 'string' ? profile.website.trim() : '';
  const portfolioItems = parsePortfolio(profile.portfolio);

  const profileSkills = Array.isArray(profile.skills) ? profile.skills : [];
  const categorySkills = [...new Set(gigsWithPrice.map((g) => g.categoryName).filter(Boolean))] as string[];
  const skills = [...new Set([...profileSkills, ...categorySkills])];

  const aboutText =
    profile.bio?.trim() ||
    (gigsWithPrice.length > 0 ? gigsWithPrice[0].description : null);
  const aboutTruncated =
    aboutText && aboutText.length > ABOUT_TRUNCATE
      ? aboutText.slice(0, ABOUT_TRUNCATE).trim() + '...'
      : aboutText || null;

  const badgeVariant = sellerLevel.level === 'top_rated' ? 'brand' : sellerLevel.level === 'new' ? 'default' : 'success';

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.surface }}>
      <NavbarClient />

      <div className="mx-auto max-w-5xl px-6 pt-[72px] sm:pt-20 pb-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content - left */}
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-2xl border p-8" style={{ backgroundColor: C.white, borderColor: C.border }}>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <GFAvatar
                  src={profile.avatar_url}
                  name={profile.display_name || profile.username}
                  size="xl"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold" style={{ color: C.ink }}>
                      {profile.display_name || profile.username || 'Seller'}
                    </h1>
                    <GFBadge variant={badgeVariant}>{sellerLevel.label}</GFBadge>
                  </div>
                  {profileTagline ? (
                    <p className="mt-1 text-sm font-medium" style={{ color: C.ink }}>
                      {profileTagline}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm" style={{ color: C.muted }}>
                    @{profile.username || profile.user_id.slice(0, 8)}
                  </p>
                  {(profileLocation || profileWebsite) && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm" style={{ color: C.muted }}>
                      {profileLocation && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={14} aria-hidden />
                          {profileLocation}
                        </span>
                      )}
                      {profileWebsite && (
                        <a
                          href={externalHref(profileWebsite)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                          style={{ color: C.brand }}
                        >
                          <Globe size={14} aria-hidden />
                          Website
                        </a>
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-sm" style={{ color: C.muted }}>
                    {reviewCount > 0 ? (
                      <StarRating rating={avgRating!} count={reviewCount} size={14} />
                    ) : (
                      <span>No reviews yet</span>
                    )}
                    <span>·</span>
                    <span>{gigsWithPrice.length} gig{gigsWithPrice.length === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/messages?sellerId=${profile.user_id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors hover:bg-black/5"
                    style={{ borderColor: C.border, color: C.ink }}
                  >
                    Contact me
                  </Link>
                </div>
              </div>
            </div>

            {aboutTruncated && (
              <div className="rounded-2xl border p-8" style={{ backgroundColor: C.white, borderColor: C.border }}>
                <h2 className="mb-4 text-xl font-bold" style={{ color: C.ink }}>About me</h2>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed" style={{ color: C.muted }}>
                  {aboutTruncated}
                </p>
              </div>
            )}

            {portfolioItems.length > 0 && (
              <div className="rounded-2xl border p-8" style={{ backgroundColor: C.white, borderColor: C.border }}>
                <h2 className="mb-6 text-xl font-bold" style={{ color: C.ink }}>Portfolio</h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  {portfolioItems.map((item) => (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-2xl border"
                      style={{ borderColor: C.border, backgroundColor: C.surface }}
                    >
                      <div className="relative aspect-[4/3]" style={{ backgroundColor: C.surface }}>
                        <Image
                          src={item.image_url}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold" style={{ color: C.ink }}>
                          {item.title}
                        </h3>
                        {item.url && (
                          <a
                            href={externalHref(item.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm font-medium underline-offset-2 hover:underline"
                            style={{ color: C.brand }}
                          >
                            View project
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {skills.length > 0 && (
              <div className="rounded-2xl border p-8" style={{ backgroundColor: C.white, borderColor: C.border }}>
                <h2 className="mb-4 text-xl font-bold" style={{ color: C.ink }}>Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Link
                      key={skill}
                      href={`/search?q=${encodeURIComponent(skill)}`}
                      className="rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:border-orange-400"
                      style={{ borderColor: C.border, color: C.ink, backgroundColor: C.surface }}
                    >
                      {skill}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-6 text-xl font-bold" style={{ color: C.ink }}>See my services</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {gigsWithPrice.map((gig) => (
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
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${C.brandMuted}, rgba(255,107,0,0.2))` }} />
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="mb-2 line-clamp-2 font-semibold" style={{ color: C.ink }}>
                        {gig.title}
                      </h3>
                      <p className="mb-4 line-clamp-2 text-sm" style={{ color: C.muted }}>
                        {gig.description?.slice(0, 100) || ''}
                        {(gig.description?.length || 0) > 100 ? '...' : ''}
                      </p>
                      <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: C.border }}>
                        <span className="text-xs uppercase tracking-wide" style={{ color: C.muted }}>From</span>
                        <span className="text-lg font-bold" style={{ color: C.ink }}>${gig.minPrice}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Contact card - right sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border p-6" style={{ backgroundColor: C.white, borderColor: C.border }}>
              <div className="flex items-center gap-4 mb-4">
                <GFAvatar src={profile.avatar_url} name={profile.display_name || profile.username} size="lg" />
                <div>
                  <p className="font-semibold" style={{ color: C.ink }}>
                    {profile.display_name || profile.username || 'Seller'}
                  </p>
                  <p className="text-sm" style={{ color: C.success }}>Online</p>
                </div>
              </div>
              <Link
                href={`/messages?sellerId=${profile.user_id}`}
                className="block w-full"
              >
                <span
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${C.brandLight}, ${C.brand})` }}
                >
                  <Send size={16} />
                  Contact me
                </span>
              </Link>
              <p className="mt-3 text-center text-sm" style={{ color: C.muted }}>
                Average response time: 1 hour
              </p>
            </div>
          </div>
        </div>

        {gigsWithPrice.length === 0 && (
          <div className="rounded-2xl border p-12" style={{ backgroundColor: C.white, borderColor: C.border }}>
            <p style={{ color: C.muted }}>No published gigs yet.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
