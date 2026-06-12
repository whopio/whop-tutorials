"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField, TextArea, Select, Switch } from "@whop/react/components";
import { Pin } from "@/components/Icons";

type Visibility = "PUBLIC" | "SUPPORTERS" | "TIER";

interface TierOption {
  id: string;
  name: string;
}

export interface PostRow {
  id: string;
  title: string;
  visibility: Visibility;
  minimumTierName: string | null;
  pinned: boolean;
  createdAt: string;
}

const VISIBILITY_LABEL: Record<Visibility, string> = {
  PUBLIC: "Public",
  SUPPORTERS: "Supporters",
  TIER: "Tier",
};

export default function PostManager({
  posts,
  tiers,
}: {
  posts: PostRow[];
  tiers: TierOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [minimumTierId, setMinimumTierId] = useState("");
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (visibility === "TIER" && !minimumTierId) {
      setError("Pick a tier for tier-gated posts.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          imageUrl: imageUrl || undefined,
          visibility,
          minimumTierId: visibility === "TIER" ? minimumTierId : undefined,
          pinned,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create post");
        setSaving(false);
        return;
      }
      setTitle("");
      setContent("");
      setImageUrl("");
      setVisibility("PUBLIC");
      setMinimumTierId("");
      setPinned(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete post");
        setDeletingId(null);
        return;
      }
      setDeletingId(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {posts.length > 0 ? (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="kofi-card flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {post.pinned ? <span title="Pinned" className="text-muted"><Pin className="h-4 w-4" /></span> : null}
                  <h3 className="truncate font-semibold">{post.title}</h3>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5">
                    {post.visibility === "TIER" && post.minimumTierName
                      ? post.minimumTierName
                      : VISIBILITY_LABEL[post.visibility]}
                  </span>{" "}
                  · {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                type="button"
                size="2"
                variant="surface"
                color="gray"
                className="shrink-0"
                onClick={() => onDelete(post.id)}
                disabled={deletingId === post.id}
              >
                {deletingId === post.id ? "Deleting…" : "Delete"}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="kofi-card p-6 text-sm text-muted">
          No posts yet. Write your first update below.
        </div>
      )}

      <form onSubmit={onSubmit} className="kofi-card space-y-4 p-6">
        <h2 className="text-lg font-semibold">Write a post</h2>

        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="post-title">
            Title
          </label>
          <TextField.Root size="3">
            <TextField.Input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A new piece is up!"
              required
              maxLength={140}
            />
          </TextField.Root>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="post-content">
            Content
          </label>
          <TextArea
            id="post-content"
            size="3"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            required
            maxLength={10000}
            placeholder="Share what you've been working on…"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="post-image">
            Image URL <span className="font-normal text-muted">(optional)</span>
          </label>
          <TextField.Root size="3">
            <TextField.Input
              id="post-image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </TextField.Root>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold" htmlFor="post-visibility">
              Who can see it
            </label>
            <Select.Root value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}>
              <Select.Trigger id="post-visibility" className="w-full" />
              <Select.Content>
                <Select.Item value="PUBLIC">Public — everyone</Select.Item>
                <Select.Item value="SUPPORTERS">Supporters only</Select.Item>
                <Select.Item value="TIER">Specific tier</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>

          {visibility === "TIER" ? (
            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="post-tier">
                Minimum tier
              </label>
              <Select.Root
                value={minimumTierId || undefined}
                onValueChange={(v) => setMinimumTierId(v)}
              >
                <Select.Trigger id="post-tier" className="w-full" placeholder="Select a tier…" />
                <Select.Content>
                  {tiers.map((tier) => (
                    <Select.Item key={tier.id} value={tier.id}>
                      {tier.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              {tiers.length === 0 ? (
                <p className="mt-1 text-xs text-muted">Create a tier first to gate by tier.</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Switch checked={pinned} onCheckedChange={setPinned} />
          Pin this post to the top of my page
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" size="3" variant="solid" disabled={saving}>
          {saving ? "Publishing…" : "Publish post"}
        </Button>
      </form>
    </div>
  );
}
