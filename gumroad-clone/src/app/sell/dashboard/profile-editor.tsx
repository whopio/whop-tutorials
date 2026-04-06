// src/app/sell/dashboard/profile-editor.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";

interface Props {
  headline: string | null;
  bio: string | null;
}

export function ProfileEditor({ headline, bio }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [headlineVal, setHeadlineVal] = useState(headline || "");
  const [bioVal, setBioVal] = useState(bio || "");

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/sell/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: headlineVal || null,
          bio: bioVal || null,
        }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
      >
        <Pencil className="h-3 w-3" />
        {headline || bio ? "Edit profile" : "Add headline & bio"}
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-3 border border-border bg-surface p-4">
      <div>
        <label htmlFor="headline" className="block text-xs font-medium text-text-secondary">
          Headline
        </label>
        <input
          id="headline"
          type="text"
          maxLength={100}
          value={headlineVal}
          onChange={(e) => setHeadlineVal(e.target.value)}
          placeholder="e.g. Digital artist & template maker"
          className="mt-1 w-full border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="bio" className="block text-xs font-medium text-text-secondary">
          Bio
        </label>
        <textarea
          id="bio"
          rows={3}
          maxLength={2000}
          value={bioVal}
          onChange={(e) => setBioVal(e.target.value)}
          placeholder="Tell buyers about yourself..."
          className="mt-1 w-full border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Save className="h-3 w-3" />
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}
