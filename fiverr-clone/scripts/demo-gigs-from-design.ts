/**
 * Demo from Design system: copies images, creates demo users (profiles + sellers),
 * creates gigs with full Design copy (titles, descriptions, packages, gallery, reviews),
 * and optionally updates existing gigs with no gallery.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local).
 * Run: npx tsx scripts/demo-gigs-from-design.ts
 *
 * Demo user avatars are uploaded to Supabase Storage (avatars bucket) so they load
 * regardless of app origin (localhost vs production).
 *
 * Env:
 *   DEMO_COPY_IMAGES=1   Copy Design/public/images to public/images (default: 1)
 *   DEMO_UPDATE_GIGS=1  Update existing gigs with empty gallery (default: 1)
 *   DEMO_CREATE_USERS=1 Create demo users from Design (default: 1)
 *   DEMO_SEED_GIGS=1    Create 9 demo gigs + packages + orders/reviews (default: 1)
 *   DEMO_PASSWORD=...   Password for demo users (default: DemoPassword123!)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const AVATARS_BUCKET = 'avatars';

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
const COPY_IMAGES = (process.env.DEMO_COPY_IMAGES ?? '1') === '1';
const UPDATE_GIGS = (process.env.DEMO_UPDATE_GIGS ?? '1') === '1';
const CREATE_USERS = (process.env.DEMO_CREATE_USERS ?? '1') === '1';
const SEED_GIGS = (process.env.DEMO_SEED_GIGS ?? '1') === '1';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoPassword123!';

const GALLERY_IMAGES = [
  '/images/gig-design.jpg',
  '/images/gig-marketing.jpg',
  '/images/gig-video.jpg',
  '/images/gig-writing.jpg',
  '/images/gig-dev.jpg',
];

// All demo people from Design: sellers (marketplace) + buyers (reviews). avatar = path under /images/
const DEMO_PEOPLE = [
  { displayName: 'Sarah Chen', username: 'sarah-chen', avatar: '/images/avatar-1.jpg', isSeller: true },
  { displayName: 'James Wilson', username: 'james-wilson', avatar: '/images/avatar-2.jpg', isSeller: true },
  { displayName: 'Emma Davis', username: 'emma-davis', avatar: '/images/avatar-3.jpg', isSeller: true },
  { displayName: 'Michael Brown', username: 'michael-brown', avatar: '/images/avatar-2.jpg', isSeller: true },
  { displayName: 'Olivia Taylor', username: 'olivia-taylor', avatar: '/images/avatar-3.jpg', isSeller: true },
  { displayName: 'Sofia Chen', username: 'sofia-chen', avatar: '/images/avatar-1.jpg', isSeller: true },
  { displayName: 'David Kim', username: 'david-kim', avatar: '/images/avatar-2.jpg', isSeller: true },
  { displayName: 'Rachel Green', username: 'rachel-green', avatar: '/images/avatar-3.jpg', isSeller: true },
  { displayName: 'Tom Harris', username: 'tom-harris', avatar: '/images/avatar-1.jpg', isSeller: true },
  { displayName: 'Marcus Chen', username: 'marcus-chen', avatar: '/images/avatar-1.jpg', isSeller: false },
];

// Full marketplace gig data from Design (title, seller display name, image, category, price, delivery days, rating, review count)
const DESIGN_GIGS = [
  { title: 'I will create a full brand identity system for your business', seller: 'Sarah Chen', image: '/images/gig-design.jpg', categorySlug: 'design', price: 299, deliveryDays: 5, rating: 5.0, reviews: 312 },
  { title: 'I will build a production-ready React + Next.js web application', seller: 'James Wilson', image: '/images/gig-dev.jpg', categorySlug: 'development', price: 499, deliveryDays: 7, rating: 4.9, reviews: 186 },
  { title: 'I will write SEO-optimized blog posts and landing page copy', seller: 'Emma Davis', image: '/images/gig-writing.jpg', categorySlug: 'writing', price: 75, deliveryDays: 2, rating: 4.8, reviews: 94 },
  { title: 'I will edit and color grade your video footage at a pro level', seller: 'Michael Brown', image: '/images/gig-video.jpg', categorySlug: 'video', price: 199, deliveryDays: 3, rating: 4.9, reviews: 153 },
  { title: 'I will build a full digital marketing strategy and funnel', seller: 'Olivia Taylor', image: '/images/gig-marketing.jpg', categorySlug: 'marketing', price: 350, deliveryDays: 6, rating: 4.7, reviews: 78 },
  { title: 'I will design a modern mobile app UI/UX in Figma', seller: 'Sofia Chen', image: '/images/gig-design.jpg', categorySlug: 'design', price: 399, deliveryDays: 5, rating: 5.0, reviews: 247 },
  { title: 'I will create AI-powered content workflows for your business', seller: 'David Kim', image: '/images/gig-writing.jpg', categorySlug: 'writing', price: 249, deliveryDays: 4, rating: 4.8, reviews: 61 },
  { title: 'I will develop a custom Shopify e-commerce store from scratch', seller: 'Rachel Green', image: '/images/gig-dev.jpg', categorySlug: 'development', price: 599, deliveryDays: 10, rating: 4.9, reviews: 139 },
  { title: 'I will create high-converting social media graphics and ads', seller: 'Tom Harris', image: '/images/gig-marketing.jpg', categorySlug: 'marketing', price: 125, deliveryDays: 3, rating: 4.6, reviews: 43 },
];

const DESIGN_DESCRIPTION = `Welcome to my professional brand identity design service! With over 8 years of experience working with startups and Fortune 500 companies, I create memorable, versatile brand systems that capture your essence and elevate your market position.

My process is deeply collaborative. I start by understanding your business, audience, and competitive landscape — then craft multiple concepts refined until you're 100% satisfied.

What you get:
• Original, hand-crafted designs (zero templates)
• Unlimited revisions until 100% satisfied (Premium)
• Full source files — AI, EPS, PDF, PNG, SVG
• Complete commercial rights, worldwide license
• 48-hour delivery available on request`;

// Design gig-detail packages (price in USD; we use standard tier = gig price when possible)
const DESIGN_PACKAGES_TEMPLATE = [
  { tier: 'basic' as const, name: 'Basic', delivery: 3, revisions: 2, includes: ['1 logo concept', 'PNG + JPG files', '2 revisions', 'Commercial rights'] },
  { tier: 'standard' as const, name: 'Standard', delivery: 5, revisions: 5, includes: ['3 logo concepts', 'All file formats (AI, EPS, SVG, PNG)', '5 revisions', 'Brand guide (1 page)', 'Social media kit'] },
  { tier: 'premium' as const, name: 'Premium', delivery: 7, revisions: 99, includes: ['5 logo concepts', 'All file formats', 'Unlimited revisions', 'Full brand guide (10 pages)', 'Social media kit', 'Stationery design', 'Priority support'] },
];

const DESIGN_REVIEWS = [
  { name: 'David Kim', rating: 5, body: 'Absolutely phenomenal work. Sarah understood my vision perfectly and delivered beyond expectations. The brand guide was a total bonus — couldn\'t be happier!' },
  { name: 'Rachel Green', rating: 5, body: "Fast delivery and incredible quality. I've worked with many designers, but Sarah is genuinely top-tier. Will work with her again without hesitation." },
  { name: 'Marcus Chen', rating: 5, body: 'Responsive, professional, and talented. The whole experience was seamless from brief to delivery.' },
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'gig';
}

function copyDesignImagesToPublic() {
  const designImages = resolve(process.cwd(), 'Design/public/images');
  const publicImages = resolve(process.cwd(), 'public/images');
  if (!existsSync(designImages)) {
    console.warn('Design/public/images not found, skipping copy.');
    return;
  }
  if (!existsSync(publicImages)) mkdirSync(publicImages, { recursive: true });
  const files = readdirSync(designImages);
  for (const f of files) {
    const src = join(designImages, f);
    const dest = join(publicImages, f);
    if (existsSync(src)) copyFileSync(src, dest);
  }
  console.log(`Copied ${files.length} files from Design/public/images to public/images`);
}

/** Resolve avatar path (e.g. /images/avatar-1.jpg) to a local file path. Prefers public/, then Design/public/. */
function resolveAvatarPath(avatarPath: string): string | null {
  const base = process.cwd();
  const inPublic = resolve(base, 'public', avatarPath.replace(/^\//, ''));
  if (existsSync(inPublic)) return inPublic;
  const inDesign = resolve(base, 'Design/public', avatarPath.replace(/^\//, ''));
  if (existsSync(inDesign)) return inDesign;
  return null;
}

/** Upload a local avatar file to Supabase Storage (avatars bucket) and return the public URL. */
async function uploadAvatarToStorage(
  supabase: ReturnType<typeof createClient>,
  localFilePath: string,
  userId: string
): Promise<string | null> {
  try {
    const buffer = readFileSync(localFilePath);
    const path = `${userId}/avatar.jpg`;
    const { error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
    if (error) {
      console.warn('  Storage upload failed:', error.message);
      return null;
    }
    const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn('  Avatar read/upload error:', e);
    return null;
  }
}

async function main() {
  if (COPY_IMAGES) copyDesignImagesToPublic();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ─── Update existing gigs with no gallery ─────────────────────────────────
  if (UPDATE_GIGS) {
    const { data: gigs, error } = await supabase.from('gigs').select('id, title, gallery');
    if (error) {
      console.error('Failed to fetch gigs:', error);
      process.exit(1);
    }
    const needsGallery = (gigs ?? []).filter((g) => {
      const gal = g.gallery as Array<{ url?: string }> | null;
      return !gal || gal.length === 0 || !gal.some((e) => e?.url);
    });
    for (let i = 0; i < needsGallery.length; i++) {
      const gig = needsGallery[i];
      const gallery = [
        { url: GALLERY_IMAGES[i % GALLERY_IMAGES.length], type: 'image' as const },
        ...GALLERY_IMAGES.filter((_, j) => j !== i % GALLERY_IMAGES.length).slice(0, 2).map((url) => ({ url, type: 'image' as const })),
      ];
      await supabase.from('gigs').update({ gallery: gallery.map((g, o) => ({ ...g, order: o })) }).eq('id', gig.id);
      console.log(`  Updated gallery: "${(gig.title || '').slice(0, 45)}..."`);
    }
    console.log(`Updated ${needsGallery.length} gig(s) with demo gallery.`);
  }

  if (!CREATE_USERS && !SEED_GIGS) {
    console.log('Done.');
    return;
  }

  const categoryRows = await supabase.from('categories').select('id, slug').eq('is_active', true);
  const categories = categoryRows.data ?? [];
  if (!categories.length) {
    console.error('No categories found. Seed categories first.');
    process.exit(1);
  }
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const userIdByDisplayName: Record<string, string> = {};
  // Load existing demo users so SEED_GIGS can resolve sellers when CREATE_USERS=0
  if (!CREATE_USERS && SEED_GIGS) {
    const emails = DEMO_PEOPLE.map((p) => `demo-${p.username}@gigflow-demo.local`);
    const { data: existingProfiles } = await supabase.from('profiles').select('user_id, display_name').in('email', emails);
    for (const p of existingProfiles ?? []) {
      if (p.display_name) userIdByDisplayName[p.display_name] = p.user_id;
        }
  }

  // ─── Create demo users (auth + profile + seller_accounts) ─────────────────
  if (CREATE_USERS) {
    console.log('Creating demo users...');
    for (const person of DEMO_PEOPLE) {
      const email = `demo-${person.username}@gigflow-demo.local`;
      const { data: existing } = await supabase.from('profiles').select('user_id').eq('email', email).single();
      let userId: string;
      if (existing?.user_id) {
        userId = existing.user_id;
        userIdByDisplayName[person.displayName] = userId;
        console.log(`  Exists: ${person.displayName}`);
      } else {
        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
          email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: person.displayName },
        });
        if (authErr || !authUser?.user?.id) {
          console.error(`  Failed to create user ${person.displayName}:`, authErr?.message);
          continue;
        }
        userId = authUser.user.id;
        userIdByDisplayName[person.displayName] = userId;
        console.log(`  Created: ${person.displayName} (${person.isSeller ? 'seller' : 'buyer'})`);
      }
      // Upload avatar to Supabase Storage so it loads everywhere (not tied to app origin)
      const localPath = resolveAvatarPath(person.avatar);
      const avatarUrl = localPath
        ? await uploadAvatarToStorage(supabase, localPath, userId)
        : null;
      if (avatarUrl) {
        await supabase
          .from('profiles')
          .update({
            username: person.username,
            display_name: person.displayName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('profiles')
          .update({
            username: person.username,
            display_name: person.displayName,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }
      if (person.isSeller) {
        const now = new Date().toISOString();
        await supabase.from('seller_accounts').upsert(
          { user_id: userId, kyc_status: 'verified', kyc_verified_at: now, updated_at: now },
          { onConflict: 'user_id' }
        );
      }
    }
    console.log(`Demo users ready.`);
  }

  // ─── Create 9 demo gigs with full Design data ───────────────────────────
  if (SEED_GIGS) {
    const sellerNames = DEMO_PEOPLE.filter((p) => p.isSeller).map((p) => p.displayName);
    const needUserId = sellerNames.some((n) => !userIdByDisplayName[n]);
    if (needUserId && !CREATE_USERS) {
      console.error('Run with DEMO_CREATE_USERS=1 first to create demo users, or create them manually.');
      process.exit(1);
    }
    const sellerUserIds = [...new Set(sellerNames.map((n) => userIdByDisplayName[n]).filter(Boolean))] as string[];
    const now = new Date().toISOString();
    await supabase
      .from('seller_accounts')
      .update({ kyc_status: 'verified', kyc_verified_at: now, updated_at: now })
      .in('user_id', sellerUserIds);
    console.log('Creating demo gigs from Design...');
    const createdGigIds: { id: string; sellerUserId: string; packageIds: string[] }[] = [];

    for (const gigRow of DESIGN_GIGS) {
      const sellerUserId = userIdByDisplayName[gigRow.seller];
      if (!sellerUserId) {
        console.error(`  Skip gig (no user): ${gigRow.seller}`);
        continue;
      }
      const categoryId = categoryBySlug.get(gigRow.categorySlug) ?? categories[0].id;
      const slug = `${slugify(gigRow.title)}-${crypto.randomUUID().slice(0, 8)}`;
      const gallery = [
        { url: gigRow.image, type: 'image' as const },
        ...GALLERY_IMAGES.filter((u) => u !== gigRow.image).slice(0, 2).map((url) => ({ url, type: 'image' as const })),
      ];

      const { data: gig, error: gigError } = await supabase
        .from('gigs')
        .insert({
          seller_user_id: sellerUserId,
          category_id: categoryId,
          slug,
          title: gigRow.title,
          description: DESIGN_DESCRIPTION,
          gallery: gallery.map((g, i) => ({ ...g, order: i })),
          faq: [],
          requirements_schema: [],
          status: 'published',
        })
        .select('id')
        .single();

      if (gigError || !gig) {
        console.error('  Gig insert error:', gigError?.message);
        continue;
      }

      const standardPrice = gigRow.price;
      const basicPrice = Math.round(standardPrice * 0.5);
      const premiumPrice = Math.round(standardPrice * 1.8);
      const prices = [basicPrice, standardPrice, premiumPrice];
      const deliveryDays = [3, Math.min(7, gigRow.deliveryDays), Math.min(14, gigRow.deliveryDays + 2)];
      const packageIds: string[] = [];

      for (let i = 0; i < DESIGN_PACKAGES_TEMPLATE.length; i++) {
        const t = DESIGN_PACKAGES_TEMPLATE[i];
        const { data: pkg, error: pkgErr } = await supabase
          .from('gig_packages')
          .insert({
            gig_id: gig.id,
            tier: t.tier,
            title: t.name,
            description: `${t.name} package for this service.`,
            price_cents: prices[i] * 100,
            delivery_days: deliveryDays[i],
            revisions_included: t.revisions,
            includes: t.includes,
          })
          .select('id')
          .single();
        if (!pkgErr && pkg?.id) packageIds.push(pkg.id);
      }

      createdGigIds.push({ id: gig.id, sellerUserId, packageIds });
      console.log(`  Created gig: ${gigRow.title.slice(0, 50)}...`);
    }

    // ─── Create a few orders + reviews so gigs have review counts ──────────
    const buyerId = userIdByDisplayName['Marcus Chen'] ?? Object.values(userIdByDisplayName)[0];
    if (buyerId && createdGigIds.length > 0) {
      let ordersCreated = 0;
      let reviewsCreated = 0;
      for (const g of createdGigIds.slice(0, 5)) {
        if (g.packageIds.length === 0) continue;
        const pkgId = g.packageIds[1] ?? g.packageIds[0];
        const now = new Date().toISOString();
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .insert({
            gig_id: g.id,
            package_id: pkgId,
            seller_user_id: g.sellerUserId,
            buyer_user_id: buyerId,
            status: 'completed',
            due_at: now,
            completed_at: now,
            requirements_schema: {},
          })
          .select('id')
          .single();
        if (orderErr || !order?.id) continue;
        ordersCreated++;
        const review = DESIGN_REVIEWS[reviewsCreated % DESIGN_REVIEWS.length];
        const { error: revErr } = await supabase.from('reviews').insert({
          order_id: order.id,
          gig_id: g.id,
          seller_user_id: g.sellerUserId,
          buyer_user_id: buyerId,
          rating: review.rating,
          body: review.body,
        });
        if (!revErr) reviewsCreated++;
      }
      console.log(`  Created ${ordersCreated} orders and ${reviewsCreated} reviews.`);
    }

    console.log(`Created ${createdGigIds.length} demo gigs from Design.`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
