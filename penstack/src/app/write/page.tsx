"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { Editor } from "@/components/editor/editor";
import { UploadZone } from "@/components/ui/upload-zone";
import type { PostVisibility } from "@/generated/prisma/browser";

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; description: string }[] = [
  { value: "FREE", label: "Free", description: "Visible to everyone" },
  { value: "PAID", label: "Paid", description: "Subscribers only" },
  { value: "PREVIEW", label: "Preview", description: "Free preview with paywall" },
];

export default function WritePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <WritePageInner />
    </Suspense>
  );
}

function WritePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("postId");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [content, setContent] = useState<JSONContent | undefined>(undefined);
  const [visibility, setVisibility] = useState<PostVisibility>("FREE");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!postId);

  // Load existing post if editing
  useEffect(() => {
    if (!postId) return;

    fetch(`/api/posts/${postId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load post");
        return res.json();
      })
      .then((post) => {
        setTitle(post.title);
        setSubtitle(post.subtitle ?? "");
        setCoverImageUrl(post.coverImageUrl);
        setContent(post.content as JSONContent);
        setVisibility(post.visibility);
      })
      .catch(() => {
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [postId, router]);

  const save = useCallback(
    async (publish: boolean) => {
      if (!title.trim()) return;
      setSaving(true);

      try {
        // Calculate paywallIndex from content
        let paywallIndex: number | undefined;
        if (content?.content) {
          const idx = content.content.findIndex(
            (node) => node.type === "paywallBreak"
          );
          if (idx !== -1) paywallIndex = idx;
        }

        const body = {
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          content,
          visibility,
          paywallIndex,
          published: publish,
          coverImageUrl: coverImageUrl ?? undefined,
        };

        const url = postId ? `/api/posts/${postId}` : "/api/posts";
        const method = postId ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          alert(data.error ?? "Something went wrong");
          return;
        }

        router.push("/dashboard");
      } finally {
        setSaving(false);
      }
    },
    [title, subtitle, content, visibility, coverImageUrl, postId, router]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Cover image */}
      <div className="mb-6">
        <UploadZone
          endpoint="coverImageUploader"
          onUploadComplete={(url) => setCoverImageUrl(url)}
          label="Cover image"
        />
      </div>

      {/* Title */}
      <input
        type="text"
        placeholder="Post title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border-0 bg-transparent font-serif text-4xl font-bold placeholder-gray-300 focus:outline-none focus:ring-0"
      />

      {/* Subtitle */}
      <input
        type="text"
        placeholder="Add a subtitle..."
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        className="mt-2 w-full border-0 bg-transparent text-xl text-gray-600 placeholder-gray-300 focus:outline-none focus:ring-0"
      />

      {/* Editor */}
      <div className="mt-6">
        <Editor
          initialContent={content}
          onChange={setContent}
        />
      </div>

      {/* Bottom bar */}
      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-gray-200 pt-6">
        {/* Visibility selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="visibility" className="text-sm font-medium text-gray-700">
            Visibility:
          </label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as PostVisibility)}
            className="input w-auto"
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.description}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex gap-3">
          <button
            onClick={() => save(false)}
            disabled={saving || !title.trim()}
            className="btn-secondary"
          >
            {saving ? "Saving..." : "Save draft"}
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving || !title.trim()}
            className="btn-primary"
          >
            {saving ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
