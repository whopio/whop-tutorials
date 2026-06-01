"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";

interface ProfileInlineEditorProps {
  initialHeadline: string | null;
  initialBio: string | null;
}

interface ProfileResponse {
  profile?: {
    headline: string | null;
    bio: string | null;
  };
  error?: string;
}

export function ProfileInlineEditor({
  initialHeadline,
  initialBio,
}: ProfileInlineEditorProps) {
  const router = useRouter();
  const [headline, setHeadline] = useState(initialHeadline ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [savedHeadline, setSavedHeadline] = useState(initialHeadline);
  const [savedBio, setSavedBio] = useState(initialBio);
  const [editing, setEditing] = useState(!initialHeadline && !initialBio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setHeadline(savedHeadline ?? "");
    setBio(savedBio ?? "");
    setEditing(false);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, bio }),
      });
      const data = (await res.json().catch(() => ({}))) as ProfileResponse;

      if (!res.ok || !data.profile) {
        setError(data.error ?? "Could not save profile");
        return;
      }

      setSavedHeadline(data.profile.headline);
      setSavedBio(data.profile.bio);
      setHeadline(data.profile.headline ?? "");
      setBio(data.profile.bio ?? "");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="mt-4 rounded-md border border-border bg-surface p-4">
        <div className="space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-text-secondary mb-1">
              Headline
            </span>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={140}
              placeholder="What do you write about?"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-text-primary"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-text-secondary mb-1">
              Description
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={700}
              rows={4}
              placeholder="Tell readers what they can expect from your writing."
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed text-text-primary outline-none focus:border-text-primary"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-error">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-text-primary text-background text-sm font-medium hover:bg-text-primary/85 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Check aria-hidden="true" className="size-4" />
            )}
            Save profile
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill border border-border text-sm text-text-secondary hover:text-text-primary hover:bg-background disabled:opacity-60"
          >
            <X aria-hidden="true" className="size-4" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {savedHeadline ? (
        <p className="text-text-secondary">{savedHeadline}</p>
      ) : (
        <p className="text-text-tertiary text-sm">No headline yet.</p>
      )}
      {savedBio ? (
        <p className="text-text-primary mt-3 text-[15px] leading-relaxed">{savedBio}</p>
      ) : (
        <p className="text-text-tertiary text-sm mt-2">No description yet.</p>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill border border-border text-sm text-text-secondary hover:border-text-primary hover:text-text-primary"
      >
        <Pencil aria-hidden="true" className="size-3.5" />
        Edit profile
      </button>
    </div>
  );
}
