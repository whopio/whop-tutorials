"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { PublicationCategory } from "@/generated/prisma/browser";
import { CATEGORY_LABELS } from "@/constants/categories";
import { UploadZone } from "@/components/ui/upload-zone";

interface ProfileFormProps {
  writer: {
    id: string;
    handle: string;
    name: string;
    bio?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    category: string;
    monthlyPriceInCents?: number | null;
  };
}

export function ProfileForm({ writer }: ProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(writer.name);
  const [bio, setBio] = useState(writer.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(writer.avatarUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(writer.bannerUrl ?? "");
  const [category, setCategory] = useState<PublicationCategory>(
    writer.category as PublicationCategory
  );
  const [price, setPrice] = useState(
    writer.monthlyPriceInCents ? String(writer.monthlyPriceInCents / 100) : ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/writers/${writer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio: bio || undefined,
          avatarUrl: avatarUrl || null,
          bannerUrl: bannerUrl || null,
          category,
          monthlyPriceInCents: price ? Math.round(parseFloat(price) * 100) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to update profile.");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Publication name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Handle
        </label>
        <p className="text-sm text-gray-400">/{writer.handle} (cannot be changed)</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Bio
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="input resize-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Avatar
        </label>
        {avatarUrl ? (
          <div className="flex items-center gap-4">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-16 w-16 rounded-full object-cover"
            />
            <button
              type="button"
              onClick={() => setAvatarUrl("")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Remove
            </button>
          </div>
        ) : (
          <UploadZone
            endpoint="avatarUploader"
            onUploadComplete={setAvatarUrl}
          />
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Banner
        </label>
        {bannerUrl ? (
          <div className="space-y-2">
            <img
              src={bannerUrl}
              alt="Banner"
              className="h-32 w-full rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={() => setBannerUrl("")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Remove
            </button>
          </div>
        ) : (
          <UploadZone
            endpoint="bannerUploader"
            onUploadComplete={setBannerUrl}
          />
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Category
        </label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Object.values(PublicationCategory).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                category === cat
                  ? "border-[var(--brand-600)] bg-[var(--brand-600)]/5 text-[var(--brand-600)]"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Monthly subscription price (USD)
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">$</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="5.00"
            min="1"
            max="1000"
            step="0.01"
            className="input w-32"
          />
          <span className="text-sm text-gray-400">/ month</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <p className="text-sm text-green-600">Profile updated successfully!</p>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-1.5 h-4 w-4" />
        )}
        Save changes
      </button>
    </form>
  );
}
