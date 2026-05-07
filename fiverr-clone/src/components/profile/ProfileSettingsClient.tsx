'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  MapPin,
  Link2,
  Twitter,
  Linkedin,
  Github,
  Plus,
  X,
  Check,
  Edit3,
  Globe,
  MessageCircle,
} from 'lucide-react';
import { C, GFButton, GFInput, GFTextarea, GFBadge, StarRating, GFToggle, GFProgress } from '@/components/gigflow/design-system';
import { cn } from '@/lib/utils';
import { ProfileAvatarUpload } from './ProfileAvatarUpload';
import { ProfileBannerUpload } from './ProfileBannerUpload';

type ProfileTab = 'about' | 'portfolio' | 'reviews' | 'settings';

export type ProfilePortfolioItem = { id: string; title: string; image_url: string; url?: string };

interface ProfileSettingsClientProps {
  displayName: string;
  username: string;
  bio: string;
  skills: string[];
  location?: string;
  website?: string;
  tagline?: string;
  portfolio?: ProfilePortfolioItem[];
  avatarUrl: string | null;
  bannerUrl: string | null;
  ordersDone: number;
  avgRating: number | null;
  totalEarned: string;
  onTimePercent: number;
  isSeller: boolean;
  reviewsCount: number;
  gigCount: number;
  whopLinked?: boolean;
}

export function ProfileSettingsClient({
  displayName: initialDisplayName,
  username,
  bio: initialBio,
  skills: initialSkills,
  location: initialLocation = '',
  website: initialWebsite = '',
  tagline: initialTagline = '',
  portfolio: initialPortfolio = [],
  avatarUrl,
  bannerUrl,
  ordersDone,
  avgRating,
  totalEarned,
  onTimePercent,
  isSeller,
  reviewsCount,
  gigCount,
  whopLinked = false,
}: ProfileSettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('about');
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [tagline, setTagline] = useState(initialTagline);
  const [bio, setBio] = useState(initialBio);
  const [location, setLocation] = useState(initialLocation);
  const [website, setWebsite] = useState(initialWebsite);
  const [availability, setAvailability] = useState(true);
  const [newSkill, setNewSkill] = useState('');
  const [mySkills, setMySkills] = useState<string[]>(initialSkills);
  const [portfolioItems, setPortfolioItems] = useState<ProfilePortfolioItem[]>(initialPortfolio);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [portfolioSaving, setPortfolioSaving] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [skillsMessage, setSkillsMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [skillsSaving, setSkillsSaving] = useState(false);
  const searchParams = useSearchParams();
  const [whopMessage, setWhopMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const linked = searchParams.get('whop_linked');
    const err = searchParams.get('error');
    if (linked === '1') {
      setWhopMessage({ type: 'success', text: 'Whop account linked. You can use live chat in messages.' });
      window.history.replaceState({}, '', '/account/settings');
    } else if (err === 'whop_email_mismatch') {
      setWhopMessage({ type: 'error', text: 'Whop account email must match your account email.' });
      window.history.replaceState({}, '', '/account/settings');
    }
  }, [searchParams]);

  useEffect(() => {
    setDisplayName(initialDisplayName);
    setBio(initialBio);
    setMySkills(initialSkills);
    setLocation(initialLocation);
    setWebsite(initialWebsite);
    setTagline(initialTagline);
    setPortfolioItems(initialPortfolio);
  }, [initialDisplayName, initialBio, initialSkills, initialLocation, initialWebsite, initialTagline, initialPortfolio]);

  const completionItems = [
    { label: 'Profile photo', done: !!avatarUrl },
    { label: 'Display name', done: !!displayName.trim() },
    { label: 'Tagline', done: !!tagline.trim() },
    { label: 'Bio (100+ chars)', done: bio.length >= 100 },
    { label: 'Location', done: !!location.trim() },
    { label: 'Skills (3+)', done: mySkills.length >= 3 },
    { label: 'Portfolio item', done: portfolioItems.length > 0 },
    { label: 'At least 1 live gig', done: gigCount >= 1 },
  ];
  const completionPct = Math.round(
    (completionItems.filter((c) => c.done).length / completionItems.length) * 100
  );

  const patchProfile = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to save');
    return data;
  };

  const handleSaveProfile = async () => {
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await patchProfile({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        skills: mySkills,
        location: location.trim() || null,
        website: website.trim() || null,
        tagline: tagline.trim() || null,
        portfolio: portfolioItems,
      });
      setSuccess(true);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSkills = async () => {
    setSkillsMessage(null);
    setSkillsSaving(true);
    try {
      await patchProfile({ skills: mySkills });
      setSkillsMessage({ type: 'ok', text: 'Skills saved.' });
      router.refresh();
    } catch (e) {
      setSkillsMessage({ type: 'err', text: e instanceof Error ? e.message : 'Failed to save skills' });
    } finally {
      setSkillsSaving(false);
    }
  };

  const handleSavePortfolio = async (items: ProfilePortfolioItem[]) => {
    setPortfolioError(null);
    setPortfolioSaving(true);
    try {
      await patchProfile({ portfolio: items });
      router.refresh();
    } catch (e) {
      setPortfolioError(e instanceof Error ? e.message : 'Failed to save portfolio');
    } finally {
      setPortfolioSaving(false);
    }
  };

  const handleAddPortfolioWork = async () => {
    if (!portfolioFile) {
      setPortfolioError('Choose an image first.');
      return;
    }
    setPortfolioError(null);
    setPortfolioUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', portfolioFile);
      const up = await fetch('/api/profile/portfolio/upload', { method: 'POST', body: fd });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) {
        setPortfolioError(upData.error || 'Upload failed');
        return;
      }
      const url = upData.url as string;
      if (!url) {
        setPortfolioError('No image URL returned');
        return;
      }
      const item: ProfilePortfolioItem = {
        id: crypto.randomUUID(),
        title: portfolioTitle.trim() || 'Portfolio work',
        image_url: url,
        ...(portfolioUrl.trim() ? { url: portfolioUrl.trim() } : {}),
      };
      const next = [...portfolioItems, item];
      setPortfolioItems(next);
      setPortfolioTitle('');
      setPortfolioUrl('');
      setPortfolioFile(null);
      await handleSavePortfolio(next);
    } catch {
      setPortfolioError('Upload failed');
    } finally {
      setPortfolioUploading(false);
    }
  };

  const removePortfolioItem = async (id: string) => {
    const next = portfolioItems.filter((p) => p.id !== id);
    setPortfolioItems(next);
    await handleSavePortfolio(next);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.surface }}>
      <div
        className="relative h-36 overflow-hidden"
        style={
          bannerUrl
            ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: `linear-gradient(135deg, ${C.ink} 0%, #1A1A2E 100%)` }
        }
      >
        {!bannerUrl && (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(17,17,17,0.95), rgba(26,26,46,0.95))' }} />
        )}
        <ProfileBannerUpload currentBannerUrl={bannerUrl} />
      </div>

      <div className="max-w-5xl mx-auto px-6">
        <div className="relative flex items-end justify-between mb-6" style={{ marginTop: '-40px' }}>
          <div className="flex items-end gap-5">
            <div className="relative">
              <ProfileAvatarUpload currentAvatarUrl={avatarUrl} displayName={displayName || null} />
              {availability && (
                <div
                  className="absolute top-1 right-1 w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: C.success }}
                />
              )}
            </div>

            <div className="pb-1">
              {editing ? (
                <div className="flex flex-col gap-1.5">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="text-xl font-bold bg-transparent border-b focus:outline-none"
                    style={{ borderColor: C.brand, color: C.ink }}
                  />
                  <input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Tagline"
                    className="text-sm bg-transparent border-b focus:outline-none"
                    style={{ borderColor: C.border, color: C.muted }}
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold" style={{ color: C.ink }}>
                      {displayName || 'Your Name'}
                    </h1>
                    {isSeller && (
                      <>
                        <GFBadge variant="dark">Pro Seller</GFBadge>
                        <GFBadge variant="success" dot>Available</GFBadge>
                      </>
                    )}
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: C.muted }}>
                    {tagline.trim() ? tagline : `@${username || 'username'}`}
                  </p>
                </>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: C.muted }}>
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    {location}
                  </span>
                )}
                {website && (
                  <span className="flex items-center gap-1">
                    <Globe size={11} />
                    {website}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-1">
            <GFButton
              variant={editing ? 'brand' : 'outline'}
              size="sm"
              iconLeft={<Edit3 size={14} />}
              onClick={editing ? handleSaveProfile : () => setEditing(!editing)}
              disabled={loading}
            >
              {editing ? 'Save Profile' : 'Edit Profile'}
            </GFButton>
            <Link href="/sell/gigs/new">
              <GFButton variant="ghost" size="sm">+ New Gig</GFButton>
            </Link>
          </div>
        </div>

        {isSeller && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              [String(ordersDone), 'Orders Done'],
              [avgRating ? avgRating.toFixed(2) : '—', 'Avg Rating'],
              [totalEarned, 'Total Earned'],
              [`${onTimePercent}%`, 'On-time Delivery'],
            ].map(([v, l], i) => (
              <div
                key={i}
                className="rounded-2xl border p-4 text-center"
                style={{ backgroundColor: C.white, borderColor: C.border }}
              >
                <div className="text-2xl font-bold" style={{ color: C.ink }}>
                  {v}
                </div>
                <div className="text-xs mt-0.5" style={{ color: C.muted }}>
                  {l}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 border-b mb-6" style={{ borderColor: C.border }}>
          {(['about', 'portfolio', 'reviews', 'settings'] as ProfileTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={cn('px-5 py-3 text-sm font-semibold transition-all capitalize')}
              style={{
                color: activeTab === t ? C.ink : C.muted,
                borderBottom: activeTab === t ? `2px solid ${C.brand}` : '2px solid transparent',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'about' && (
          <div className="grid lg:grid-cols-[1fr_300px] gap-6 pb-10">
            <div className="flex flex-col gap-6">
              <div
                className="rounded-2xl border p-6"
                style={{ backgroundColor: C.white, borderColor: C.border }}
              >
                <h3 className="font-bold mb-3" style={{ color: C.ink }}>
                  About me
                </h3>
                {editing ? (
                  <GFTextarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={5}
                  />
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
                    {bio || 'Add a bio to tell buyers about yourself.'}
                  </p>
                )}
              </div>

              <div
                className="rounded-2xl border p-6"
                style={{ backgroundColor: C.white, borderColor: C.border }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold" style={{ color: C.ink }}>
                    Skills
                  </h3>
                  <span className="text-xs" style={{ color: C.muted }}>
                    {mySkills.length} skills
                  </span>
                </div>
                <p className="text-xs mb-3" style={{ color: C.muted }}>
                  Add skills below, then click Save skills to store them on your profile.
                </p>
                <div className="flex flex-wrap gap-2">
                  {mySkills.map((skill) => (
                    <div
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium"
                      style={{ borderColor: C.border, color: C.ink, backgroundColor: C.surface }}
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => setMySkills(mySkills.filter((s) => s !== skill))}
                        className="hover:text-red-500 transition"
                        aria-label={`Remove ${skill}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <div
                    className="inline-flex items-center gap-1 border rounded-full overflow-hidden"
                    style={{ borderColor: C.border }}
                  >
                    <input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSkill.trim()) {
                          setMySkills([...mySkills, newSkill.trim()]);
                          setNewSkill('');
                        }
                      }}
                      placeholder="Add skill..."
                      className="px-3 py-1.5 text-sm bg-transparent focus:outline-none"
                      style={{ color: C.ink, width: 120 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSkill.trim()) {
                          setMySkills([...mySkills, newSkill.trim()]);
                          setNewSkill('');
                        }
                      }}
                      className="px-2 py-1.5"
                      style={{ backgroundColor: C.brandMuted, color: C.brand }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                {skillsMessage && (
                  <p
                    className="text-xs mt-3"
                    style={{ color: skillsMessage.type === 'ok' ? C.success : C.error }}
                  >
                    {skillsMessage.text}
                  </p>
                )}
                <GFButton
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={handleSaveSkills}
                  disabled={skillsSaving}
                >
                  {skillsSaving ? 'Saving…' : 'Save skills'}
                </GFButton>
              </div>

              <div
                className="rounded-2xl border p-6"
                style={{ backgroundColor: C.white, borderColor: C.border }}
              >
                <h3 className="font-bold mb-4" style={{ color: C.ink }}>
                  Links & socials
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Link2 size={16} style={{ color: C.muted }} />
                    {editing ? (
                      <GFInput
                        placeholder="Website URL"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="flex-1"
                      />
                    ) : (
                      <span style={{ color: website ? C.brand : C.muted }}>
                        {website || 'Not set'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Linkedin size={16} style={{ color: '#0A66C2' }} />
                    <span style={{ color: C.muted }}>Not connected</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Github size={16} style={{ color: C.ink }} />
                    <span style={{ color: C.muted }}>Not connected</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Twitter size={16} style={{ color: '#1DA1F2' }} />
                    <span style={{ color: C.muted }}>Not connected</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div
                className="rounded-2xl border p-5"
                style={{ backgroundColor: C.white, borderColor: C.border }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm" style={{ color: C.ink }}>
                    Profile strength
                  </h3>
                  <span className="text-sm font-bold" style={{ color: C.brand }}>
                    {completionPct}%
                  </span>
                </div>
                <GFProgress value={completionPct} max={100} />
                <div className="flex flex-col gap-2 mt-4">
                  {completionItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: item.done ? C.success : C.border }}
                      >
                        {item.done ? (
                          <Check size={9} color="white" />
                        ) : (
                          <span style={{ color: C.muted }}>–</span>
                        )}
                      </div>
                      <span style={{ color: item.done ? C.ink : C.muted }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-2xl border p-5"
                style={{ backgroundColor: C.white, borderColor: C.border }}
              >
                <GFToggle
                  checked={availability}
                  onChange={setAvailability}
                  label="Available for work"
                />
                <p className="text-xs mt-2" style={{ color: C.muted }}>
                  When enabled, buyers see a green dot on your profile.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="pb-10">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm" style={{ color: C.muted }}>
                {portfolioItems.length} {portfolioItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            {portfolioError && (
              <p className="text-sm mb-4" style={{ color: C.error }}>
                {portfolioError}
              </p>
            )}
            <div
              className="rounded-2xl border p-6 mb-8 space-y-4 max-w-xl"
              style={{ backgroundColor: C.white, borderColor: C.border }}
            >
              <h3 className="font-bold text-sm" style={{ color: C.ink }}>
                Add portfolio work
              </h3>
              <GFInput
                label="Title"
                placeholder="Project title"
                value={portfolioTitle}
                onChange={(e) => setPortfolioTitle(e.target.value)}
              />
              <GFInput
                label="Link (optional)"
                placeholder="https://…"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
              />
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: C.muted }}>
                  Image
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="text-sm w-full"
                  onChange={(e) => setPortfolioFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <GFButton
                variant="brand"
                size="sm"
                iconLeft={<Plus size={14} />}
                onClick={handleAddPortfolioWork}
                disabled={portfolioUploading || portfolioSaving || !portfolioFile}
              >
                {portfolioUploading ? 'Uploading…' : 'Add work'}
              </GFButton>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border overflow-hidden group relative"
                  style={{ backgroundColor: C.white, borderColor: C.border }}
                >
                  <div className="aspect-[4/3] relative bg-black/5">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-sm" style={{ color: C.ink }}>
                      {item.title}
                    </p>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs mt-1 inline-block underline"
                        style={{ color: C.brand }}
                      >
                        View link
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePortfolioItem(item.id)}
                    disabled={portfolioSaving}
                    className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    aria-label="Remove"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            {portfolioItems.length === 0 && (
              <p className="text-sm" style={{ color: C.muted }}>
                No portfolio items yet. Add an image and title above.
              </p>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="pb-10">
            <div
              className="flex items-center gap-8 p-6 rounded-2xl border mb-5"
              style={{ backgroundColor: C.white, borderColor: C.border }}
            >
              <div className="text-center">
                <div className="text-5xl font-bold" style={{ color: C.ink }}>
                  {avgRating ? avgRating.toFixed(2) : '—'}
                </div>
                <StarRating rating={avgRating ?? 0} size={18} />
                <div className="text-sm mt-1" style={{ color: C.muted }}>
                  {reviewsCount} reviews
                </div>
              </div>
            </div>
            <p className="text-sm" style={{ color: C.muted }}>
              No reviews yet.
            </p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid md:grid-cols-2 gap-5 pb-10">
            <div
              className="rounded-2xl border p-6 flex flex-col gap-4"
              style={{ backgroundColor: C.white, borderColor: C.border }}
            >
              <h3 className="font-bold" style={{ color: C.ink }}>
                Account settings
              </h3>
              <GFInput
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <GFInput
                label="Username"
                value={username}
                disabled
                prefix={<span className="text-sm" style={{ color: C.muted }}>@</span>}
              />
              <GFInput
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              {error && (
                <p className="text-sm" style={{ color: C.error }}>
                  {error}
                </p>
              )}
              {success && (
                <p className="text-sm" style={{ color: C.success }}>
                  Changes saved.
                </p>
              )}
              <GFButton
                variant="brand"
                size="md"
                className="w-full"
                onClick={handleSaveProfile}
                disabled={loading}
              >
                Save Changes
              </GFButton>
            </div>
            <div className="flex flex-col gap-4">
              {whopMessage && (
                <div
                  className="rounded-2xl border p-4 text-sm"
                  style={{
                    backgroundColor: whopMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    borderColor: whopMessage.type === 'success' ? C.success : C.error,
                    color: whopMessage.type === 'success' ? C.success : C.error,
                  }}
                >
                  {whopMessage.text}
                </div>
              )}
              <div
                className="rounded-2xl border p-6"
                style={{ backgroundColor: C.white, borderColor: C.border }}
              >
                <h3 className="font-bold mb-4" style={{ color: C.ink }}>
                  Security
                </h3>
                <div className="flex flex-col gap-3">
                  <GFButton variant="outline" size="sm" className="w-full">
                    Change Password
                  </GFButton>
                </div>
              </div>
              <div
                className="rounded-2xl border p-6"
                style={{ backgroundColor: C.white, borderColor: C.border }}
              >
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: C.ink }}>
                  <MessageCircle size={18} />
                  Live chat (Whop)
                </h3>
                <p className="text-sm mb-4" style={{ color: C.muted }}>
                  Link your Whop account to use live chat in buyer–seller messages.
                </p>
                {whopLinked ? (
                  <div className="flex items-center gap-2 text-sm" style={{ color: C.success }}>
                    <Check size={16} />
                    Whop account linked
                  </div>
                ) : (
                  <a href="/api/auth/whop/link">
                    <GFButton variant="outline" size="sm">
                      Link Whop account
                    </GFButton>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
