import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: gig } = await supabase
    .from('gigs')
    .select('id, seller_user_id, status')
    .eq('id', id)
    .single();

  if (!gig || gig.seller_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    title?: string;
    description?: string;
    category_id?: string | null;
    gallery?: Array<{ url: string; type: 'image' | 'video' }>;
    faq?: Array<{ question: string; answer: string }>;
    packages?: Array<{
      id?: string;
      tier: 'basic' | 'standard' | 'premium';
      title: string;
      description: string;
      price_cents: number;
      delivery_days: number;
      revisions_included: number;
      includes: string[];
    }>;
    extras?: Array<{
      id?: string;
      title: string;
      description?: string;
      price_cents: number;
      delivery_days_add?: number;
      max_quantity?: number;
    }>;
    status?: 'draft' | 'review' | 'published';
    requirements_schema?: Array<{ id: string; type: string; question: string; required: boolean }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, description, category_id, gallery, faq, requirements_schema, packages, extras, status } = body;

  // Sellers cannot self-publish; only admin can approve (review→published). Reactivating paused is OK.
  if (status === 'published' && gig.status !== 'paused') {
    return NextResponse.json(
      { error: 'Gigs must go through moderation. Submit for review instead.' },
      { status: 403 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined && title.trim()) updates.title = title.trim();
  if (description !== undefined) updates.description = description?.trim() ?? '';
  if (category_id !== undefined) updates.category_id = category_id || null;
  if (Array.isArray(gallery)) {
    updates.gallery = gallery
      .filter((g) => g?.url && (g.type === 'image' || g.type === 'video'))
      .map((g, i) => ({ url: g.url, type: g.type, order: i }));
  }
  if (Array.isArray(faq)) {
    updates.faq = faq
      .map((f) => ({ question: (f?.question || '').trim(), answer: (f?.answer || '').trim() }))
      .filter((f) => f.question);
  }
  if (Array.isArray(requirements_schema)) {
    updates.requirements_schema = requirements_schema
      .filter((r) => r && typeof r.question === 'string' && r.question.trim())
      .map((r) => ({ id: r.id || `req_${Math.random().toString(36).slice(2)}`, type: r.type || 'text', question: r.question.trim(), required: Boolean(r.required) }));
  }
  if (status && ['draft', 'review', 'published', 'paused', 'rejected', 'requires_modification'].includes(status))
    updates.status = status;

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from('gigs')
      .update(updates)
      .eq('id', id);
    if (updateError) {
      console.error('Gig update error:', updateError);
      return NextResponse.json({ error: 'Failed to update gig' }, { status: 500 });
    }
  }

  if (Array.isArray(packages) && packages.length > 0) {
    await supabase.from('gig_packages').delete().eq('gig_id', id);
    const validTiers = ['basic', 'standard', 'premium'] as const;
    for (const pkg of packages) {
      if (!validTiers.includes(pkg.tier)) continue;
      if (!pkg.title?.trim() || !pkg.description?.trim()) continue;
      if (typeof pkg.price_cents !== 'number' || pkg.price_cents < 500) continue;
      await supabase.from('gig_packages').insert({
        gig_id: id,
        tier: pkg.tier,
        title: pkg.title.trim(),
        description: pkg.description.trim(),
        price_cents: pkg.price_cents,
        delivery_days: pkg.delivery_days ?? 7,
        revisions_included: pkg.revisions_included ?? 1,
        includes: Array.isArray(pkg.includes) ? pkg.includes : [],
      });
    }
  }

  if (Array.isArray(extras)) {
    await supabase.from('gig_extras').delete().eq('gig_id', id);
    for (const ex of extras) {
      if (!ex.title?.trim() || typeof ex.price_cents !== 'number' || ex.price_cents < 0) continue;
      await supabase.from('gig_extras').insert({
        gig_id: id,
        title: ex.title.trim(),
        description: ex.description?.trim() || null,
        price_cents: ex.price_cents,
        delivery_days_add: Math.max(0, Math.min(365, ex.delivery_days_add ?? 0)),
        max_quantity: Math.max(1, Math.min(50, ex.max_quantity ?? 1)),
      });
    }
  }

  const { data: updated } = await supabase
    .from('gigs')
    .select('id, slug')
    .eq('id', id)
    .single();

  return NextResponse.json({ id: updated?.id, slug: updated?.slug });
}
