import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: seller } = await supabase
    .from('seller_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!seller) {
    return NextResponse.json({ error: 'Not a seller' }, { status: 403 });
  }

  let body: {
    title: string;
    description: string;
    category_id?: string | null;
    gallery?: Array<{ url: string; type: 'image' | 'video' }>;
    faq?: Array<{ question: string; answer: string }>;
    requirements_schema?: Array<{ id: string; type: string; question: string; required: boolean }>;
    packages: Array<{
      tier: 'basic' | 'standard' | 'premium';
      title: string;
      description: string;
      price_cents: number;
      delivery_days: number;
      revisions_included: number;
      includes: string[];
    }>;
    extras?: Array<{
      title: string;
      description?: string;
      price_cents: number;
      delivery_days_add?: number;
      max_quantity?: number;
    }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, description, category_id, gallery, faq, requirements_schema, packages, extras } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }
  if (!packages?.length || packages.length < 1) {
    return NextResponse.json({ error: 'At least one package is required' }, { status: 400 });
  }

  const validTiers = ['basic', 'standard', 'premium'] as const;
  for (const pkg of packages) {
    if (!validTiers.includes(pkg.tier)) {
      return NextResponse.json({ error: `Invalid package tier: ${pkg.tier}` }, { status: 400 });
    }
    if (!pkg.title?.trim() || !pkg.description?.trim()) {
      return NextResponse.json({ error: `Package ${pkg.tier} must have title and description` }, { status: 400 });
    }
    if (typeof pkg.price_cents !== 'number' || pkg.price_cents < 500) {
      return NextResponse.json({ error: `Package ${pkg.tier} price must be at least $5 (500 cents)` }, { status: 400 });
    }
    const delivery = pkg.delivery_days ?? 7;
    if (delivery < 1 || delivery > 365) {
      return NextResponse.json({ error: `Package ${pkg.tier} delivery days must be 1–365` }, { status: 400 });
    }
    const revs = pkg.revisions_included ?? 1;
    if (revs < 0 || revs > 50) {
      return NextResponse.json({ error: `Package ${pkg.tier} revisions must be 0–50` }, { status: 400 });
    }
  }

  const baseSlug = slugify(title) || 'gig';
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

  const galleryList = Array.isArray(gallery) ? gallery.filter((g) => g?.url && (g.type === 'image' || g.type === 'video')) : [];

  const reqSchema = Array.isArray(requirements_schema) && requirements_schema.length > 0
    ? requirements_schema
        .filter((r) => r && typeof r.question === 'string' && r.question.trim())
        .map((r) => ({ id: r.id || `req_${Math.random().toString(36).slice(2)}`, type: r.type || 'text', question: r.question.trim(), required: Boolean(r.required) }))
    : [];

  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .insert({
      seller_user_id: user.id,
      category_id: category_id || null,
      slug,
      title: title.trim(),
      description: description.trim(),
      gallery: galleryList.map((g, i) => ({ url: g.url, type: g.type, order: i })),
      faq: Array.isArray(faq) && faq.length > 0
        ? faq.map((f) => ({ question: f.question?.trim() || '', answer: f.answer?.trim() || '' })).filter((f) => f.question)
        : [],
      requirements_schema: reqSchema,
      status: 'draft',
    })
    .select('id')
    .single();

  if (gigError || !gig) {
    if (gigError?.code === '23505') {
      return NextResponse.json({ error: 'Slug conflict, please try again' }, { status: 409 });
    }
    console.error('Gig insert error:', gigError);
    return NextResponse.json({ error: 'Failed to create gig' }, { status: 500 });
  }

  for (const pkg of packages) {
    const { error: pkgError } = await supabase.from('gig_packages').insert({
      gig_id: gig.id,
      tier: pkg.tier,
      title: pkg.title.trim(),
      description: pkg.description.trim(),
      price_cents: pkg.price_cents,
      delivery_days: pkg.delivery_days ?? 7,
      revisions_included: pkg.revisions_included ?? 1,
      includes: Array.isArray(pkg.includes) ? pkg.includes : [],
    });
    if (pkgError) {
      await supabase.from('gigs').delete().eq('id', gig.id);
      console.error('Package insert error:', pkgError);
      return NextResponse.json({ error: 'Failed to create packages' }, { status: 500 });
    }
  }

  const extrasList = Array.isArray(extras) ? extras : [];
  for (const ex of extrasList) {
    if (!ex.title?.trim() || typeof ex.price_cents !== 'number' || ex.price_cents < 0) continue;
    const { error: exError } = await supabase.from('gig_extras').insert({
      gig_id: gig.id,
      title: ex.title.trim(),
      description: ex.description?.trim() || null,
      price_cents: ex.price_cents,
      delivery_days_add: Math.max(0, Math.min(365, ex.delivery_days_add ?? 0)),
      max_quantity: Math.max(1, Math.min(50, ex.max_quantity ?? 1)),
    });
    if (exError) {
      console.error('Extra insert error:', exError);
    }
  }

  return NextResponse.json({ id: gig.id, slug });
}
