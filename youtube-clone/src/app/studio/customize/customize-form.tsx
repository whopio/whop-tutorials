"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, User } from "lucide-react";
import { updateChannel } from "@/lib/channel-actions";

type ChannelProfile = {
  name: string;
  handle: string;
  description: string;
  avatarUrl: string;
  bannerUrl: string;
};

export function CustomizeForm({ channel }: { channel: ChannelProfile }) {
  const router = useRouter();
  const [name, setName] = useState(channel.name);
  const [handle, setHandle] = useState(channel.handle);
  const [description, setDescription] = useState(channel.description);
  const [avatarUrl, setAvatarUrl] = useState(channel.avatarUrl);
  const [bannerUrl, setBannerUrl] = useState(channel.bannerUrl);
  const [uploading, setUploading] = useState<null | "avatar" | "banner">(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  async function pickImage(kind: "avatar" | "banner", file: File) {
    setUploading(kind);
    setError(null);
    setSaved(false);
    try {
      // Channel images upload to Whop's files endpoint (via our server route),
      // which returns a public media.whop.com URL. Videos still go to Blob.
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/whop/upload", { method: "POST", body: form });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Image upload failed.");
      }
      if (kind === "avatar") setAvatarUrl(data.url);
      else setBannerUrl(data.url);
    } catch (e) {
      setError((e as Error).message || "Image upload failed.");
    } finally {
      setUploading(null);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateChannel({
        name,
        handle,
        description,
        avatarUrl,
        bannerUrl,
      });
      if ("error" in res) {
        setError(res.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-6">
      {/* Banner */}
      <div>
        <span className="mb-2 block text-xs text-fg-muted">Banner image</span>
        <div className="relative aspect-[6/1] w-full overflow-hidden rounded-xl bg-hover">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
          <label className="absolute inset-0 grid cursor-pointer place-items-center bg-black/40 text-sm font-medium text-white opacity-0 transition hover:opacity-100">
            <span className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5" />
              {uploading === "banner" ? "Uploading…" : "Change banner"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickImage("banner", f);
              }}
            />
          </label>
        </div>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-hover">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-10 w-10 text-fg-muted" />
          )}
        </div>
        <label className="cursor-pointer rounded-full bg-chip px-4 py-2 text-sm font-medium hover:bg-hover-strong">
          {uploading === "avatar" ? "Uploading…" : "Change avatar"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickImage("avatar", f);
            }}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-fg-muted">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={50}
          className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 outline-none focus:border-accent"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-fg-muted">Handle</span>
        <div className="flex items-center rounded-lg border border-border focus-within:border-accent">
          <span className="pl-3 text-fg-muted">@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            required
            maxLength={30}
            className="w-full bg-transparent px-1 py-2.5 outline-none"
          />
        </div>
        <span className="mt-1 block text-xs text-fg-muted">
          Changing your handle changes your channel URL.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-fg-muted">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={1000}
          className="w-full resize-y rounded-lg border border-border bg-transparent px-3 py-2.5 outline-none focus:border-accent"
        />
      </label>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {saved ? <p className="text-sm text-green-500">Saved.</p> : null}

      <div>
        <button
          type="submit"
          disabled={pending || uploading !== null || !name.trim()}
          className="rounded-full bg-accent px-5 py-2.5 font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
