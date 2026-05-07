'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Play, Plus, Trash2, Upload } from 'lucide-react';
import { C, GFButton, GFInput, GFProgress, GFTextarea } from '@/components/gigflow/design-system';

type Tier = 'basic' | 'standard' | 'premium';
const TIER_LABELS: Record<Tier, string> = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };

const STEPS = [
  { id: 0, label: 'Overview', desc: 'Title, category, description' },
  { id: 1, label: 'Pricing', desc: 'Packages & extras' },
  { id: 2, label: 'Description & FAQ', desc: 'FAQs' },
  { id: 3, label: 'Requirements', desc: 'Buyer questions' },
  { id: 4, label: 'Gallery', desc: 'Images & video' },
] as const;
type Tab = (typeof STEPS)[number]['label'];

interface Package {
  tier: Tier;
  title: string;
  description: string;
  price_cents: number;
  delivery_days: number;
  revisions_included: number;
  includes: string[];
}

interface Extra {
  title: string;
  description: string;
  price_cents: number;
  delivery_days_add: number;
  max_quantity: number;
}

interface Faq {
  question: string;
  answer: string;
}

interface Requirement {
  id: string;
  type: 'text' | 'textarea';
  question: string;
  required: boolean;
}

interface Category {
  id: string;
  slug: string;
  name: string;
}

interface InitialData {
  title: string;
  description: string;
  categoryId: string;
  gallery: Array<{ url: string; type: 'image' | 'video' }>;
  faqs: Faq[];
  packages: Package[];
  extras: Extra[];
  requirements?: Requirement[];
}

interface GigCreateFormProps {
  categories: Category[];
  gigId?: string;
  slug?: string;
  initialData?: InitialData;
  currentStatus?: string;
}

const defaultPackages: Package[] = [
  { tier: 'basic', title: 'Basic', description: '', price_cents: 2500, delivery_days: 5, revisions_included: 1, includes: [] },
  { tier: 'standard', title: 'Standard', description: '', price_cents: 5000, delivery_days: 7, revisions_included: 2, includes: [] },
  { tier: 'premium', title: 'Premium', description: '', price_cents: 10000, delivery_days: 10, revisions_included: 3, includes: [] },
];

export function GigCreateForm({ categories, gigId, slug, initialData, currentStatus }: GigCreateFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const activeTab = STEPS[step].label;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [gallery, setGallery] = useState<Array<{ url: string; type: 'image' | 'video' }>>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [packages, setPackages] = useState<Package[]>(defaultPackages);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setCategoryId(initialData.categoryId);
      setGallery(initialData.gallery);
      setPackages(initialData.packages);
      setExtras(initialData.extras.length > 0 ? initialData.extras : []);
      setFaqs(initialData.faqs.length > 0 ? initialData.faqs : []);
      setRequirements(initialData.requirements && initialData.requirements.length > 0 ? initialData.requirements : []);
    }
  }, [initialData]);

  const updatePackage = (tier: Tier, updates: Partial<Package>) => {
    setPackages((prev) => prev.map((p) => (p.tier === tier ? { ...p, ...updates } : p)));
  };

  const addExtra = () => {
    setExtras((prev) => [...prev, { title: '', description: '', price_cents: 500, delivery_days_add: 0, max_quantity: 1 }]);
  };

  const removeExtra = (i: number) => {
    setExtras((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateExtra = (i: number, updates: Partial<Extra>) => {
    setExtras((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...updates } : e)));
  };

  const addFaq = () => {
    setFaqs((prev) => [...prev, { question: '', answer: '' }]);
  };

  const removeFaq = (i: number) => {
    setFaqs((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateFaq = (i: number, updates: Partial<Faq>) => {
    setFaqs((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...updates } : f)));
  };

  const addRequirement = () => {
    setRequirements((prev) => [
      ...prev,
      { id: `req_${Date.now()}`, type: 'text' as const, question: '', required: true },
    ]);
  };

  const removeRequirement = (i: number) => {
    setRequirements((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateRequirement = (i: number, updates: Partial<Requirement>) => {
    setRequirements((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...updates } : r)));
  };

  const canSubmit = () =>
    title.trim().length >= 10 &&
    description.trim().length >= 50 &&
    packages.every((p) => p.title.trim() && p.description.trim() && p.price_cents >= 500);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGalleryUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/sell/gigs/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url && data.type) {
        setGallery((prev) => [...prev, { url: data.url, type: data.type }]);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Upload failed');
    } finally {
      setGalleryUploading(false);
      e.target.value = '';
    }
  };

  const removeGalleryItem = (i: number) => {
    setGallery((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (publish?: boolean) => {
    setLoading(true);
    setError(null);
    setSaveSuccess(false);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category_id: categoryId || null,
      gallery: gallery,
      faq: faqs.filter((f) => f.question.trim()),
      requirements_schema: requirements
        .filter((r) => r.question.trim())
        .map((r) => ({ id: r.id, type: r.type, question: r.question.trim(), required: r.required })),
      packages: packages.map((p) => ({
        tier: p.tier,
        title: p.title.trim(),
        description: p.description.trim(),
        price_cents: p.price_cents,
        delivery_days: p.delivery_days,
        revisions_included: p.revisions_included,
        includes: p.includes.filter(Boolean),
      })),
      extras: extras
        .filter((e) => e.title.trim())
        .map((e) => ({
          title: e.title.trim(),
          description: e.description.trim() || undefined,
          price_cents: e.price_cents,
          delivery_days_add: e.delivery_days_add,
          max_quantity: e.max_quantity,
        })),
    };
    try {
      const url = gigId ? `/api/sell/gigs/${gigId}` : '/api/sell/gigs';
      const method = gigId ? 'PATCH' : 'POST';
      const body =
        gigId
          ? { ...payload, status: publish && currentStatus === 'draft' ? 'review' : undefined }
          : payload;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (gigId ? 'Failed to update gig' : 'Failed to create gig'));
        setLoading(false);
        return;
      }
      if (publish && slug) {
        router.push(`/g/${slug}`);
        router.refresh();
        setLoading(false);
        return;
      }
      if (gigId) {
        setSaveSuccess(true);
        setLoading(false);
        router.refresh();
        return;
      }
      if (data?.id) {
        router.replace(`/sell/gigs/${data.id}/edit`);
        router.refresh();
        setLoading(false);
        return;
      }
      router.push('/sell/gigs');
      router.refresh();
      setLoading(false);
    } catch {
      setError(gigId ? 'Failed to update gig' : 'Failed to create gig');
      setLoading(false);
    }
  };

  const handleSaveAndPreview = async () => {
    setLoading(true);
    setError(null);
    setSaveSuccess(false);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category_id: categoryId || null,
      gallery,
      faq: faqs.filter((f) => f.question.trim()),
      requirements_schema: requirements
        .filter((r) => r.question.trim())
        .map((r) => ({ id: r.id, type: r.type, question: r.question.trim(), required: r.required })),
      packages: packages.map((p) => ({
        tier: p.tier,
        title: p.title.trim(),
        description: p.description.trim(),
        price_cents: p.price_cents,
        delivery_days: p.delivery_days,
        revisions_included: p.revisions_included,
        includes: p.includes.filter(Boolean),
      })),
      extras: extras
        .filter((e) => e.title.trim())
        .map((e) => ({
          title: e.title.trim(),
          description: e.description.trim() || undefined,
          price_cents: e.price_cents,
          delivery_days_add: e.delivery_days_add,
          max_quantity: e.max_quantity,
        })),
    };
    try {
      if (gigId) {
        const body = currentStatus === 'draft'
          ? { ...payload, status: 'review' as const }
          : payload;
        const res = await fetch(`/api/sell/gigs/${gigId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to update gig');
          setLoading(false);
          return;
        }
        if (slug) router.push(`/g/${slug}`);
        else router.push('/sell/gigs');
        setLoading(false);
      } else {
        const res = await fetch('/api/sell/gigs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to create gig');
          setLoading(false);
          return;
        }
        if (data.slug) router.push(`/g/${data.slug}`);
        else router.push('/sell/gigs');
        setLoading(false);
      }
      router.refresh();
    } catch {
      setError('Failed to save');
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Step Navigation */}
      <div
        className="flex items-center gap-0 mb-6 rounded-2xl border overflow-hidden"
        style={{ borderColor: C.border, backgroundColor: C.white }}
      >
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => step > i && setStep(i)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-4 px-3 text-center transition-all relative ${
              step === i ? 'shadow-sm' : i < step ? 'cursor-pointer hover:opacity-90' : ''
            }`}
            style={{ backgroundColor: step === i ? C.brandMuted : 'transparent' }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1"
              style={{
                backgroundColor: i < step ? C.success : step === i ? C.brand : C.border,
                color: i <= step ? C.white : C.muted,
              }}
            >
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span className="text-xs font-semibold hidden sm:block" style={{ color: step === i ? C.brand : i < step ? C.success : C.muted }}>{s.label}</span>
            <span className="text-[10px] hidden md:block" style={{ color: C.muted }}>{s.desc}</span>
            {i < STEPS.length - 1 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-8" style={{ backgroundColor: C.border }} />
            )}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <GFProgress value={step} max={STEPS.length - 1} label={`Step ${step + 1} of ${STEPS.length} — ${STEPS[step].label}`} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl p-4 text-sm" style={{ backgroundColor: '#FEE2E2', color: C.error }}>{error}</div>
      )}
      {saveSuccess && (
        <div className="mb-6 rounded-xl p-4 text-sm" style={{ backgroundColor: '#DCFCE7', color: C.ink }}>
          Changes saved.
        </div>
      )}

      {/* Tab content */}
      <div className="rounded-2xl border p-6 mb-8" style={{ backgroundColor: C.white, borderColor: C.border }}>
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          <h2 className="font-bold" style={{ color: C.ink }}>Gig overview</h2>
          <div>
            <GFInput
              label="Gig title"
              placeholder="e.g. I will design a professional logo for your business"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
            <p className="mt-1 text-xs" style={{ color: C.muted }}>
              As your Gig storefront, your title is the most important place to include keywords. {title.length}/80 characters.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: C.ink }}>Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
              style={{ borderColor: C.border, backgroundColor: C.white }}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <GFTextarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your service, what you deliver, and why buyers should choose you..."
              rows={8}
            />
            <p className="mt-1 text-xs" style={{ color: C.muted }}>
              Min 50 characters. {description.length} characters.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'Pricing' && (
        <div className="space-y-8">
          <div>
            <h2 className="font-bold" style={{ color: C.ink }}>Packages</h2>
            <p className="mt-1 text-sm" style={{ color: C.muted }}>
              Set pricing tiers. At least one package required. Minimum $5 per package.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {packages.map((pkg) => (
              <div
                key={pkg.tier}
                className="flex flex-col rounded-xl border p-6"
                style={{ borderColor: C.border }}
              >
                <h3 className="mb-4 font-medium" style={{ color: C.ink }}>
                  {TIER_LABELS[pkg.tier]}
                </h3>
                <div className="space-y-4">
                  <GFInput
                    label="Package title"
                    placeholder={`${TIER_LABELS[pkg.tier]} package`}
                    value={pkg.title}
                    onChange={(e) => updatePackage(pkg.tier, { title: e.target.value })}
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium" style={{ color: C.ink }}>Price ($)</label>
                    <input
                      type="number"
                      min={5}
                      max={99999}
                      step={5}
                      value={pkg.price_cents / 100}
                      onChange={(e) =>
                        updatePackage(pkg.tier, {
                          price_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                        })
                      }
                      className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                      style={{ borderColor: C.border }}
                    />
                  </div>
                  <GFTextarea
                    label="What's included"
                    placeholder="Describe what the buyer gets..."
                    value={pkg.description}
                    onChange={(e) => updatePackage(pkg.tier, { description: e.target.value })}
                    rows={3}
                  />
                  <div className="flex gap-4">
                    <div className="w-28">
                      <label className="mb-1 block text-xs font-medium" style={{ color: C.ink }}>Delivery (days)</label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={pkg.delivery_days}
                        onChange={(e) =>
                          updatePackage(pkg.tier, { delivery_days: parseInt(e.target.value || '7', 10) })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                        style={{ borderColor: C.border }}
                      />
                    </div>
                    <div className="w-28">
                      <label className="mb-1 block text-xs font-medium" style={{ color: C.ink }}>Revisions</label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={pkg.revisions_included}
                        onChange={(e) =>
                          updatePackage(pkg.tier, {
                            revisions_included: parseInt(e.target.value || '0', 10),
                          })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                        style={{ borderColor: C.border }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h2 className="mb-2 font-bold" style={{ color: C.ink }}>Add-ons (optional)</h2>
            <p className="mb-4 text-sm" style={{ color: C.muted }}>
              Offer extras buyers can add, e.g. &quot;Source files&quot;, &quot;Rush delivery&quot;.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {extras.map((ex, i) => (
                <div
                  key={i}
                  className="flex gap-4 rounded-xl border p-4"
                  style={{ borderColor: C.border }}
                >
                  <div className="min-w-0 flex-1 space-y-3">
                    <GFInput
                      label="Title"
                      placeholder="e.g. Source files"
                      value={ex.title}
                      onChange={(e) => updateExtra(i, { title: e.target.value })}
                    />
                    <div>
                      <label className="mb-1.5 block text-sm font-medium" style={{ color: C.ink }}>Price ($)</label>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={ex.price_cents / 100}
                        onChange={(e) =>
                          updateExtra(i, { price_cents: Math.round(parseFloat(e.target.value || '0') * 100) })
                        }
                        className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                        style={{ borderColor: C.border }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExtra(i)}
                    className="self-start rounded-lg p-2 transition-colors hover:opacity-70"
                    style={{ color: C.muted }}
                    aria-label="Remove"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            <GFButton
              type="button"
              variant="outline"
              size="sm"
              onClick={addExtra}
              iconLeft={<Plus size={16} />}
              className="mt-4"
            >
              Add extra
            </GFButton>
          </div>
        </div>
      )}

      {activeTab === 'Description & FAQ' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-bold" style={{ color: C.ink }}>FAQ (optional)</h2>
            <p className="mt-1 text-sm" style={{ color: C.muted }}>
              Add common questions to help buyers understand your service.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="space-y-4 rounded-xl border p-4"
                style={{ borderColor: C.border }}
              >
                <div className="flex justify-between">
                  <span className="text-sm font-medium" style={{ color: C.ink }}>FAQ {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFaq(i)}
                    className="text-sm hover:underline"
                    style={{ color: C.muted }}
                  >
                    Remove
                  </button>
                </div>
                <GFInput
                  placeholder="Question"
                  value={faq.question}
                  onChange={(e) => updateFaq(i, { question: e.target.value })}
                />
                <GFTextarea
                  placeholder="Answer"
                  value={faq.answer}
                  onChange={(e) => updateFaq(i, { answer: e.target.value })}
                  rows={2}
                />
              </div>
            ))}
          </div>
          <GFButton
            type="button"
            variant="outline"
            size="sm"
            onClick={addFaq}
            iconLeft={<Plus size={16} />}
          >
            Add FAQ
          </GFButton>
        </div>
      )}

      {activeTab === 'Requirements' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-bold" style={{ color: C.ink }}>What do you need from the buyer?</h2>
            <p className="mt-1 text-sm" style={{ color: C.muted }}>
              Add questions that buyers must answer before you start. Examples: &quot;What is your brand name?&quot;, &quot;Describe your project&quot;.
            </p>
          </div>
          <div className="space-y-4">
            {requirements.map((req, i) => (
              <div
                key={req.id}
                className="flex flex-col gap-3 rounded-xl border p-4"
                style={{ borderColor: C.border }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <GFInput
                      placeholder="e.g. What is your brand name?"
                      value={req.question}
                      onChange={(e) => updateRequirement(i, { question: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRequirement(i)}
                    className="shrink-0 rounded-lg p-2 transition-colors hover:opacity-70"
                    style={{ color: C.muted }}
                    aria-label="Remove"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={req.type}
                    onChange={(e) => updateRequirement(i, { type: e.target.value as 'text' | 'textarea' })}
                    className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                    style={{ borderColor: C.border }}
                  >
                    <option value="text">Short answer</option>
                    <option value="textarea">Paragraph</option>
                  </select>
                  <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: C.muted }}>
                    <input type="checkbox" checked={req.required} onChange={(e) => updateRequirement(i, { required: e.target.checked })} className="rounded" />
                    Required
                  </label>
                </div>
              </div>
            ))}
          </div>
          <GFButton
            type="button"
            variant="outline"
            size="sm"
            onClick={addRequirement}
            iconLeft={<Plus size={16} />}
          >
            Add requirement
          </GFButton>
        </div>
      )}

      {activeTab === 'Gallery' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-bold" style={{ color: C.ink }}>Photos & videos</h2>
            <p className="mt-1 text-sm" style={{ color: C.muted }}>
              Add images or videos to showcase your work. First image is the cover. Images max 5MB, videos max 50MB.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {gallery.map((item, i) => (
              <div
                key={i}
                className="group relative aspect-square overflow-hidden rounded-xl border"
                style={{ borderColor: C.border }}
              >
                {item.type === 'image' ? (
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: C.surface }}>
                    <video src={item.url} className="h-full w-full object-cover" muted />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play size={32} className="text-white drop-shadow-md" fill="currentColor" />
                    </div>
                  </div>
                )}
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeGalleryItem(i)}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <label
              className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors ${
                galleryUploading ? 'cursor-not-allowed opacity-60' : ''
              }`}
              style={{ borderColor: C.border }}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                onChange={handleGalleryUpload}
                disabled={galleryUploading}
                className="hidden"
              />
              {galleryUploading ? (
                <div
                  className="h-8 w-8 animate-spin rounded-full border-2"
                  style={{ borderColor: C.border, borderTopColor: C.brand }}
                />
              ) : (
                <Upload size={24} style={{ color: C.muted }} />
              )}
              <span className="text-center text-xs" style={{ color: C.muted }}>
                {galleryUploading ? 'Uploading...' : 'Add photo or video'}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div
        className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t pt-6"
        style={{ borderColor: C.border }}
      >
        {step > 0 && (
          <GFButton variant="outline" onClick={() => setStep(step - 1)}>
            Back
          </GFButton>
        )}
        <GFButton variant="outline" onClick={() => handleSubmit(false)} disabled={loading || !canSubmit()}>
          {loading ? 'Saving...' : gigId ? 'Save' : 'Save as draft'}
        </GFButton>
        <GFButton
          variant="brand"
          onClick={() => {
            if (activeTab === 'Gallery') {
              handleSaveAndPreview();
            } else {
              setStep(step + 1);
            }
          }}
          disabled={loading || (activeTab === 'Gallery' && !canSubmit())}
        >
          {activeTab === 'Gallery'
            ? (gigId ? (currentStatus === 'draft' ? 'Submit for review' : 'Save & Preview') : 'Create gig')
            : 'Next'}
        </GFButton>
      </div>
      </div>
    </div>
  );
}
