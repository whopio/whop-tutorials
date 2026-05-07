import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NavAccount } from '@/components/layout/NavAccount';
import { GigCreateForm } from '@/components/sell/GigCreateForm';
import { NoSellerAccount } from '@/components/sell/NoSellerAccount';
import { C } from '@/lib/design-tokens';
import { createClient } from '@/lib/supabase/server';
import { getWhopVerificationStatus } from '@/lib/whop-verification';

export default async function EditGigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--gray-100)' }}>
        <Link href={`/login?next=/sell/gigs/${id}/edit`}>
          <span className="rounded-xl bg-[var(--primary)] px-4 py-2 text-white">Sign in</span>
        </Link>
      </div>
    );
  }

  const { data: gig } = await supabase
    .from('gigs')
    .select(`
      id,
      title,
      description,
      category_id,
      gallery,
      faq,
      requirements_schema,
      status,
      slug,
      seller_user_id,
      gig_packages(id, tier, title, description, price_cents, delivery_days, revisions_included, includes),
      gig_extras(id, title, description, price_cents, delivery_days_add, max_quantity)
    `)
    .eq('id', id)
    .eq('seller_user_id', user.id)
    .single();

  if (!gig) notFound();

  const { data: seller } = await supabase
    .from('seller_accounts')
    .select('kyc_status, whop_company_id')
    .eq('user_id', user.id)
    .single();

  if (!seller) {
    return <NoSellerAccount context="To edit this gig," />;
  }

  let isVerified = seller.kyc_status === 'verified';
  if (seller.whop_company_id && process.env.WHOP_API_KEY) {
    const { verified } = await getWhopVerificationStatus(
      seller.whop_company_id,
      process.env.WHOP_API_KEY
    );
    if (verified) isVerified = true;
  }

  if (!isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: C.surface }}>
        <div className="text-center">
          <p className="mb-4 text-sm" style={{ color: C.muted }}>Complete verification first.</p>
          <Link
            href="/sell/kyc"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm"
            style={{ background: `linear-gradient(135deg, ${C.brandLight}, ${C.brand})` }}
          >
            Complete verification
          </Link>
        </div>
      </div>
    );
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('is_active', true)
    .order('name');

  const rawGallery = (gig.gallery || []) as Array<{ url: string; type?: string; order?: number }>;
  const gallery = rawGallery.map((g) => ({
    url: g.url,
    type: (g.type === 'video' ? 'video' : 'image') as 'image' | 'video',
  }));

  const rawFaq = (gig.faq || []) as Array<{ question?: string; answer?: string }>;
  const faqs = rawFaq.map((f) => ({ question: f.question || '', answer: f.answer || '' }));

  const rawReqs = (gig.requirements_schema || []) as Array<{ id?: string; type?: string; question?: string; required?: boolean }>;
  const requirements = rawReqs.map((r) => ({
    id: r.id || `req_${Math.random().toString(36).slice(2)}`,
    type: (r.type === 'textarea' ? 'textarea' : 'text') as 'text' | 'textarea',
    question: r.question || '',
    required: Boolean(r.required),
  }));

  const rawPackages = (gig.gig_packages || []) as Array<{
    tier: string;
    title: string;
    description: string;
    price_cents: number;
    delivery_days: number;
    revisions_included: number;
    includes: unknown[];
  }>;
  const tierOrder = ['basic', 'standard', 'premium'] as const;
  const packages = tierOrder.map((tier) => {
    const p = rawPackages.find((r) => r.tier === tier);
    if (p) {
      return {
        tier: tier as 'basic' | 'standard' | 'premium',
        title: p.title,
        description: p.description,
        price_cents: p.price_cents,
        delivery_days: p.delivery_days,
        revisions_included: p.revisions_included,
        includes: Array.isArray(p.includes) ? (p.includes as string[]).filter(Boolean) : [],
      };
    }
    const defaults: Record<string, { tier: 'basic' | 'standard' | 'premium'; price_cents: number; delivery_days: number; revisions_included: number }> = {
      basic: { tier: 'basic', price_cents: 2500, delivery_days: 5, revisions_included: 1 },
      standard: { tier: 'standard', price_cents: 5000, delivery_days: 7, revisions_included: 2 },
      premium: { tier: 'premium', price_cents: 10000, delivery_days: 10, revisions_included: 3 },
    };
    const d = defaults[tier];
    return {
      tier: d.tier,
      title: d.tier.charAt(0).toUpperCase() + d.tier.slice(1),
      description: '',
      price_cents: d.price_cents,
      delivery_days: d.delivery_days,
      revisions_included: d.revisions_included,
      includes: [] as string[],
    };
  });

  const rawExtras = (gig.gig_extras || []) as Array<{
    title: string;
    description?: string | null;
    price_cents: number;
    delivery_days_add?: number;
    max_quantity?: number;
  }>;
  const extras = rawExtras.map((e) => ({
    title: e.title || '',
    description: e.description || '',
    price_cents: e.price_cents,
    delivery_days_add: e.delivery_days_add ?? 0,
    max_quantity: e.max_quantity ?? 1,
  }));

  const initialData = {
    title: gig.title || '',
    description: gig.description || '',
    categoryId: gig.category_id || '',
    gallery,
    faqs,
    packages,
    extras,
    requirements,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.surface }}>
      <NavAccount />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm mb-1" style={{ color: C.muted }}>
              <Link href="/sell/gigs" className="hover:opacity-70 transition">My Gigs</Link>
              <span>/</span>
              <span style={{ color: C.ink }}>Edit Gig</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: C.ink }}>Edit gig</h1>
            <p className="mt-1 text-sm" style={{ color: C.muted }}>Status: <strong>{gig.status}</strong></p>
          </div>
          <Link
            href={`/g/${gig.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors hover:bg-black/5"
            style={{ borderColor: C.border, color: C.ink }}
          >
            Preview
          </Link>
        </div>
        <GigCreateForm
          categories={categories || []}
          gigId={gig.id}
          slug={gig.slug}
          initialData={initialData}
          currentStatus={gig.status}
        />
      </div>
    </div>
  );
}
