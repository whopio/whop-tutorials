"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField, TextArea } from "@whop/react/components";
import ImageUploadField from "@/components/dashboard/ImageUploadField";
import { ACCENT_OPTIONS } from "@/lib/accent";

interface CreatorSettings {
  displayName: string;
  bio: string;
  coverImageUrl: string;
  avatarUrl: string;
  tags: string[];
  accentColor: string;
}

export default function SettingsForm({ creator }: { creator: CreatorSettings }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(creator.displayName);
  const [bio, setBio] = useState(creator.bio);
  const [coverImageUrl, setCoverImageUrl] = useState(creator.coverImageUrl);
  const [avatarUrl, setAvatarUrl] = useState(creator.avatarUrl);
  const [tagsText, setTagsText] = useState(creator.tags.join(", "));
  const [accentColor, setAccentColor] = useState(creator.accentColor);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const res = await fetch("/api/creator/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          bio,
          coverImageUrl,
          avatarUrl,
          tags,
          accentColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save settings");
        setSaving(false);
        return;
      }
      setSaved(true);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="kofi-card space-y-5 p-6">
      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="settings-name">
          Display name
        </label>
        <TextField.Root size="3">
          <TextField.Input
            id="settings-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={60}
          />
        </TextField.Root>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="settings-bio">
          Bio
        </label>
        <TextArea
          id="settings-bio"
          size="3"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Tell supporters what you create."
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <ImageUploadField label="Cover image" field="coverImageUrl" value={coverImageUrl} onChange={setCoverImageUrl} />
        <ImageUploadField label="Avatar" field="avatarUrl" value={avatarUrl} onChange={setAvatarUrl} round />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="settings-tags">
          Tags <span className="font-normal text-muted">(comma-separated)</span>
        </label>
        <TextField.Root size="3">
          <TextField.Input
            id="settings-tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="illustration, comics, tutorials"
          />
        </TextField.Root>
      </div>

      <div>
        <span className="mb-2 block text-sm font-semibold">Accent color</span>
        <div className="flex flex-wrap gap-2">
          {ACCENT_OPTIONS.map((option) => {
            const selected = accentColor === option.name;
            return (
              <button
                key={option.name}
                type="button"
                onClick={() => setAccentColor(option.name)}
                title={option.name}
                aria-label={option.name}
                aria-pressed={selected}
                className={`h-9 w-9 rounded-full border-2 transition ${
                  selected ? "border-ink scale-110" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: option.hex }}
              />
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted capitalize">Selected: {accentColor}</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm text-positive">Saved.</p> : null}

      <Button type="submit" size="3" variant="solid" disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
