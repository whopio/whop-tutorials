import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge, Button } from '@/components/ui';
import { GigReviewActions } from '../GigReviewActions';

export default async function AdminGigDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: gig } = await supabase
    .from('gigs')
    .select(`
      id,
      slug,
      title,
      description,
      faq,
      gallery,
      status,
      created_at,
      seller_user_id,
      gig_packages(id, tier, title, description, price_cents, delivery_days, revisions_included, includes),
      categories(name)
    `)
    .eq('id', id)
    .single();

  if (!gig || gig.status !== 'review') notFound();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('user_id', gig.seller_user_id)
    .single();

  const packages = (gig.gig_packages || []) as Array<{
    tier: string;
    title: string;
    description: string;
    price_cents: number;
    delivery_days: number;
    revisions_included: number;
    includes: string[];
  }>;
  const faq = (gig.faq || []) as Array<{ question?: string; answer?: string }>;
  const gallery = (gig.gallery || []) as Array<{ url: string; type?: string }>;
  const catData = gig.categories as { name: string }[] | { name: string } | null;
  const category = Array.isArray(catData) ? catData[0] ?? null : catData;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/gigs"
          className="text-sm font-medium"
          style={{ color: 'var(--primary)' }}
        >
          Back to Gig Reviews
        </Link>
        <GigReviewActions gigId={gig.id} />
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--white)' }}>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--black)' }}>
                {gig.title}
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--gray-500)' }}>
                by {profile?.display_name ?? profile?.username ?? '—'} •{' '}
                {category?.name ?? 'Uncategorized'} • Submitted{' '}
                {new Date(gig.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge variant="warning">Pending review</Badge>
          </div>

          <div
            className="prose prose-sm max-w-none whitespace-pre-wrap"
            style={{ color: 'var(--gray-700)' }}
          >
            {gig.description}
          </div>
        </div>

        {gallery.length > 0 && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--white)' }}>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--black)' }}>
              Gallery
            </h2>
            <div className="flex flex-wrap gap-4">
              {gallery.map((item, i) => (
                <div
                  key={i}
                  className="relative aspect-video w-48 overflow-hidden rounded-lg"
                  style={{ backgroundColor: 'var(--gray-100)' }}
                >
                  {item.url && (
                    <img
                      src={item.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {packages.length > 0 && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--white)' }}>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--black)' }}>
              Packages
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.tier}
                  className="rounded-xl border p-4"
                  style={{ borderColor: 'var(--gray-200)' }}
                >
                  <div className="font-medium capitalize" style={{ color: 'var(--black)' }}>
                    {pkg.tier}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--gray-600)' }}>
                    {pkg.title}
                  </div>
                  <div className="mt-2 text-lg font-bold" style={{ color: 'var(--primary)' }}>
                    ${(pkg.price_cents / 100).toFixed(2)}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--gray-500)' }}>
                    {pkg.delivery_days} day delivery • {pkg.revisions_included} revisions
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {faq.filter((f) => f.question).length > 0 && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--white)' }}>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--black)' }}>
              FAQ
            </h2>
            <dl className="space-y-3">
              {faq
                .filter((f) => f.question)
                .map((f, i) => (
                  <div key={i}>
                    <dt className="font-medium" style={{ color: 'var(--black)' }}>
                      {f.question}
                    </dt>
                    <dd className="mt-1 text-sm" style={{ color: 'var(--gray-600)' }}>
                      {f.answer}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        )}
      </div>
    </>
  );
}
