"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Client-side avatar upload widget. Posts the selected file to /api/avatar
// which writes to the Vercel Blob store and updates Creator.avatarUrl in
// one round trip. On success we router.refresh() so the dashboard's
// server-rendered live preview picks up the new image immediately.

export function AvatarUpload({
  current,
  hasProfile,
  displayName,
}: {
  current: string | null;
  hasProfile: boolean;
  displayName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(current);

  const initial = (displayName || "?").charAt(0).toUpperCase();

  async function upload(file: File) {
    setError(null);
    // Optimistic local preview while the upload is in flight.
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/avatar", { method: "POST", body: fd });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Upload failed");
      }
      const data = (await res.json()) as { url: string };
      setPreview(data.url);
      startTransition(() => router.refresh());
    } catch (err) {
      setPreview(current);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      URL.revokeObjectURL(localUrl);
    }
  }

  async function clear() {
    setError(null);
    try {
      const res = await fetch("/api/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Couldn't remove avatar");
      setPreview(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove avatar");
    }
  }

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={displayName}
          className="h-16 w-16 rounded-full object-cover border border-neutral-200"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-xl font-semibold text-neutral-500 border border-neutral-200">
          {initial}
        </div>
      )}

      <div className="flex flex-col items-start gap-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!hasProfile || pending}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 transition-colors hover:border-neutral-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {preview ? "Replace" : "Upload avatar"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={clear}
              disabled={!hasProfile || pending}
              className="text-xs font-medium text-neutral-500 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Remove
            </button>
          )}
        </div>
        <p className="text-[11px] text-neutral-400">JPG, PNG, WEBP, or GIF. 4 MB max.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={!hasProfile || pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
