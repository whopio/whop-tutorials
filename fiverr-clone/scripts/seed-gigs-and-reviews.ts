/**
 * Seed script: creates 5 gigs (different categories, titles, descriptions, prices, tiers),
 * then creates completed orders for some of them and adds random reviews.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).
 * Run: npm run seed:gigs
 * Or: npx tsx scripts/seed-gigs-and-reviews.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local if present (no extra dependency)
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local and run again.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'gig';
}

const GIGS_SEED = [
  {
    categorySlug: 'design',
    title: 'Professional Logo Design and Brand Identity',
    description: 'I will create a unique, memorable logo and full brand identity including color palette, typography, and style guide. Perfect for startups and rebrands. Delivery includes source files and usage guidelines.',
    packages: [
      { tier: 'basic' as const, title: 'Starter Logo', description: '1 concept, 2 revisions', price_cents: 2500, delivery_days: 5, revisions_included: 2, includes: ['Logo in PNG & SVG', 'Color variants'] },
      { tier: 'standard' as const, title: 'Brand Pack', description: 'Logo + business card', price_cents: 5000, delivery_days: 7, revisions_included: 3, includes: ['Logo', 'Business card', 'Social kit'] },
      { tier: 'premium' as const, title: 'Full Brand Identity', description: 'Logo, stationery, style guide', price_cents: 12000, delivery_days: 10, revisions_included: 5, includes: ['Logo', 'Stationery', 'Style guide', 'All source files'] },
    ],
  },
  {
    categorySlug: 'development',
    title: 'React and Next.js Website Development',
    description: 'Full-stack web development using React and Next.js. Responsive, fast, and SEO-friendly. I deliver clean code and can integrate APIs, auth, and CMS. Ideal for landing pages and web apps.',
    packages: [
      { tier: 'basic' as const, title: 'Landing Page', description: 'Single page, responsive', price_cents: 5000, delivery_days: 7, revisions_included: 2, includes: ['1 page', 'Mobile responsive', 'Contact form'] },
      { tier: 'standard' as const, title: 'Multi-Page Site', description: 'Up to 5 pages', price_cents: 10000, delivery_days: 14, revisions_included: 3, includes: ['Up to 5 pages', 'SEO setup', 'Analytics'] },
      { tier: 'premium' as const, title: 'Custom Web App', description: 'Full app with backend', price_cents: 25000, delivery_days: 21, revisions_included: 5, includes: ['Custom features', 'API integration', 'Admin panel'] },
    ],
  },
  {
    categorySlug: 'marketing',
    title: 'Social Media Management and Content Strategy',
    description: 'I will manage your social channels, create engaging content, and grow your audience. Includes content calendar, posts, and performance reports. Platforms: Instagram, LinkedIn, Twitter/X.',
    packages: [
      { tier: 'basic' as const, title: 'Content Only', description: '10 posts per month', price_cents: 4000, delivery_days: 3, revisions_included: 2, includes: ['10 posts', 'Copy + visuals', 'Hashtag research'] },
      { tier: 'standard' as const, title: 'Manage & Post', description: '20 posts + scheduling', price_cents: 8000, delivery_days: 5, revisions_included: 3, includes: ['20 posts', 'Scheduling', 'Monthly report'] },
      { tier: 'premium' as const, title: 'Full Management', description: 'All platforms + ads', price_cents: 15000, delivery_days: 7, revisions_included: 5, includes: ['All content', 'Ad creatives', 'Weekly strategy call'] },
    ],
  },
  {
    categorySlug: 'writing',
    title: 'Blog Posts and SEO Article Writing',
    description: 'Professional blog posts and SEO-optimized articles that rank. I research keywords and write in your brand voice. Great for content marketing and thought leadership.',
    packages: [
      { tier: 'basic' as const, title: 'Single Article', description: 'Up to 1000 words', price_cents: 1500, delivery_days: 3, revisions_included: 2, includes: ['1 article', 'Keyword research', 'Meta description'] },
      { tier: 'standard' as const, title: '3 Articles', description: 'Up to 3000 words total', price_cents: 4000, delivery_days: 7, revisions_included: 3, includes: ['3 articles', 'SEO optimization', 'Internal linking'] },
      { tier: 'premium' as const, title: '10 Articles Bundle', description: 'Content package', price_cents: 10000, delivery_days: 14, revisions_included: 5, includes: ['10 articles', 'Content calendar', 'Ongoing support'] },
    ],
  },
  {
    categorySlug: 'video',
    title: 'Short-Form Video Editing for Social Media',
    description: 'Eye-catching short videos for TikTok, Reels, and YouTube Shorts. I edit your footage with trending sounds, captions, and effects. Fast turnaround for creators and brands.',
    packages: [
      { tier: 'basic' as const, title: '3 Shorts', description: 'Up to 60 sec each', price_cents: 3500, delivery_days: 5, revisions_included: 2, includes: ['3 videos', 'Captions', 'Format for all platforms'] },
      { tier: 'standard' as const, title: '10 Shorts', description: 'Monthly package', price_cents: 9000, delivery_days: 7, revisions_included: 3, includes: ['10 videos', 'Trending sounds', 'Thumbnails'] },
      { tier: 'premium' as const, title: 'Unlimited Edits', description: 'Weekly batch', price_cents: 18000, delivery_days: 14, revisions_included: 5, includes: ['Weekly delivery', 'Priority queue', 'Strategy tips'] },
    ],
  },
];

const REVIEW_BODIES = [
  'Exactly what I needed. Very professional and fast delivery.',
  'Great communication and quality work. Will order again.',
  'Exceeded expectations. Highly recommend.',
  'Quick turnaround and responsive to feedback. Thank you!',
  'Perfect for my project. The seller understood the brief well.',
  'Top-notch quality. Worth every penny.',
  'Very happy with the result. Will use for future projects.',
];

async function main() {
  console.log('Fetching categories...');
  const { data: categories } = await supabase.from('categories').select('id, slug').eq('is_active', true);
  if (!categories?.length) {
    console.error('No categories found. Run seed categories first.');
    process.exit(1);
  }
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  console.log('Fetching a seller and buyers...');
  const { data: sellers } = await supabase.from('seller_accounts').select('user_id').limit(1);
  const sellerUserId = sellers?.[0]?.user_id;
  if (!sellerUserId) {
    console.error('No seller account found. Create a seller account first (e.g. complete onboarding).');
    process.exit(1);
  }

  const { data: profiles } = await supabase.from('profiles').select('user_id').neq('user_id', sellerUserId).limit(5);
  const buyerUserIds = (profiles ?? []).map((p) => p.user_id);
  if (buyerUserIds.length === 0) {
    console.error('No other users found to use as buyers. Create at least one more user (e.g. sign up).');
    process.exit(1);
  }

  const now = new Date().toISOString();
  const createdGigs: { id: string; slug: string; packages: { id: string; tier: string }[] }[] = [];

  for (const gigSeed of GIGS_SEED) {
    const categoryId = categoryBySlug.get(gigSeed.categorySlug) ?? categories[0].id;
    const baseSlug = slugify(gigSeed.title);
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

    console.log(`Creating gig: ${gigSeed.title}`);
    const { data: gig, error: gigError } = await supabase
      .from('gigs')
      .insert({
        seller_user_id: sellerUserId,
        category_id: categoryId,
        slug,
        title: gigSeed.title,
        description: gigSeed.description,
        gallery: [],
        faq: [],
        requirements_schema: [],
        status: 'published',
      })
      .select('id')
      .single();

    if (gigError || !gig) {
      console.error('Gig insert error:', gigError);
      continue;
    }

    const packages: { id: string; tier: string }[] = [];
    for (const pkg of gigSeed.packages) {
      const { data: pkgRow, error: pkgError } = await supabase
        .from('gig_packages')
        .insert({
          gig_id: gig.id,
          tier: pkg.tier,
          title: pkg.title,
          description: pkg.description,
          price_cents: pkg.price_cents,
          delivery_days: pkg.delivery_days,
          revisions_included: pkg.revisions_included,
          includes: pkg.includes,
        })
        .select('id, tier')
        .single();
      if (pkgError || !pkgRow) {
        console.error('Package insert error:', pkgError);
        continue;
      }
      packages.push({ id: pkgRow.id, tier: pkgRow.tier });
    }

    createdGigs.push({ id: gig.id, slug, packages });
  }

  console.log(`Created ${createdGigs.length} gigs. Creating completed orders and reviews...`);

  let ordersCreated = 0;
  let reviewsCreated = 0;

  for (const gig of createdGigs) {
    if (gig.packages.length === 0) continue;
    const numOrders = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numOrders; i++) {
      const pkg = gig.packages[Math.floor(Math.random() * gig.packages.length)];
      const buyerId = buyerUserIds[Math.floor(Math.random() * buyerUserIds.length)];

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          gig_id: gig.id,
          package_id: pkg.id,
          seller_user_id: sellerUserId,
          buyer_user_id: buyerId,
          status: 'completed',
          due_at: now,
          completed_at: now,
          requirements_schema: {},
        })
        .select('id')
        .single();

      if (orderError || !order) {
        console.error('Order insert error:', orderError);
        continue;
      }
      ordersCreated++;

      const rating = 3 + Math.floor(Math.random() * 3);
      const body = REVIEW_BODIES[Math.floor(Math.random() * REVIEW_BODIES.length)];
      const { error: reviewError } = await supabase.from('reviews').insert({
        order_id: order.id,
        gig_id: gig.id,
        seller_user_id: sellerUserId,
        buyer_user_id: buyerId,
        rating,
        body,
      });
      if (reviewError) {
        console.error('Review insert error:', reviewError);
        continue;
      }
      reviewsCreated++;
    }
  }

  console.log('Done.');
  console.log(`  Gigs created: ${createdGigs.length}`);
  console.log(`  Orders (completed): ${ordersCreated}`);
  console.log(`  Reviews: ${reviewsCreated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
