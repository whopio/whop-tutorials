"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { ImagePlus, UploadCloud } from "lucide-react";
import { CATEGORIES, VISIBILITIES } from "@/lib/validators";
import { cn } from "@/lib/utils";
import { createVideo } from "../actions";

type Captured = {
  durationSeconds: number;
  width: number;
  height: number;
  posters: Blob[];
};

/**
 * VIDEO-2/6: read duration + dimensions and grab three candidate poster frames
 * (at 15% / 50% / 85% of the clip), entirely client-side, so the creator can
 * pick a thumbnail without a server round-trip.
 */
function captureFromVideo(file: File): Promise<Captured> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.src = url;

    let settled = false;
    let w = 0;
    let h = 0;
    let duration = 0;
    const posters: Blob[] = [];

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve({ durationSeconds: duration, width: w, height: h, posters });
    };
    // Never hang the publish flow if a file never fires loadedmetadata/seeked.
    const timeout = setTimeout(finish, 12000);

    const seekAndShoot = (t: number) =>
      new Promise<void>((res) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          try {
            const maxW = 1280;
            const scale = video.videoWidth > maxW ? maxW / video.videoWidth : 1;
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
            canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
            const ctx = canvas.getContext("2d");
            if (!ctx) return res();
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (blob) => {
                if (blob) posters.push(blob);
                res();
              },
              "image/jpeg",
              0.82,
            );
          } catch {
            res();
          }
        };
        video.addEventListener("seeked", onSeeked);
        try {
          video.currentTime = t;
        } catch {
          video.removeEventListener("seeked", onSeeked);
          res();
        }
      });

    video.onloadedmetadata = async () => {
      w = video.videoWidth;
      h = video.videoHeight;
      duration = Number.isFinite(video.duration) ? video.duration : 0;
      const fractions = duration > 0 ? [0.15, 0.5, 0.85] : [0];
      for (const f of fractions) {
        const t =
          duration > 0 ? Math.min(duration * f, Math.max(0, duration - 0.1)) : 0;
        await seekAndShoot(t);
      }
      finish();
    };
    video.onerror = () => finish();
  });
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "video";
}

export function Uploader() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] =
    useState<(typeof VISIBILITIES)[number]>("PUBLIC");
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]>("OTHER");
  const [membersOnly, setMembersOnly] = useState(false);
  const [detectedShort, setDetectedShort] = useState(false);

  // VIDEO-6: thumbnail candidates + the chosen one (index, or -1 = custom).
  const [posterUrls, setPosterUrls] = useState<string[]>([]);
  const [selectedPoster, setSelectedPoster] = useState(0);
  const [customThumb, setCustomThumb] = useState<File | null>(null);
  const [customThumbUrl, setCustomThumbUrl] = useState<string | null>(null);

  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captured = useRef<Captured | null>(null);

  async function onPick(picked: File) {
    setFile(picked);
    setTitle(picked.name.replace(/\.[^.]+$/, "").slice(0, 100));
    setError(null);
    captured.current = null;
    setPosterUrls([]);
    setSelectedPoster(0);
    setCustomThumb(null);
    setCustomThumbUrl(null);

    const result = await captureFromVideo(picked);
    captured.current = result;
    // VIDEO-10: a portrait clip ≤ 3 min is auto-classified as a Short.
    setDetectedShort(
      result.height > result.width && result.durationSeconds <= 180,
    );
    setPosterUrls(result.posters.map((p) => URL.createObjectURL(p)));
  }

  function onCustomThumb(picked: File) {
    setCustomThumb(picked);
    setCustomThumbUrl(URL.createObjectURL(picked));
    setSelectedPoster(-1);
  }

  function chosenThumb(): Blob | null {
    if (selectedPoster === -1) return customThumb;
    return captured.current?.posters[selectedPoster] ?? null;
  }

  const selectedUrl =
    selectedPoster === -1 ? customThumbUrl : (posterUrls[selectedPoster] ?? null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const base = sanitize(file.name);
      const videoBlob = await upload(`videos/${base}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        contentType: file.type,
        onUploadProgress: (p) => setProgress(p.percentage),
      });

      let thumbnailUrl: string | undefined;
      const poster = chosenThumb();
      if (poster) {
        const thumb = await upload(
          `thumbnails/${base}.jpg`,
          new File([poster], `${base}.jpg`, { type: "image/jpeg" }),
          {
            access: "public",
            handleUploadUrl: "/api/blob/upload",
            contentType: "image/jpeg",
          },
        );
        thumbnailUrl = thumb.url;
      }

      const res = await createVideo({
        title,
        description,
        visibility,
        category,
        membersOnly,
        isShort: detectedShort,
        videoUrl: videoBlob.url,
        videoPathname: videoBlob.pathname,
        thumbnailUrl,
        durationSeconds: captured.current?.durationSeconds ?? 0,
      });

      if (res.error || !res.id) {
        setError(res.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      router.push(`/watch?v=${res.id}`);
    } catch (err) {
      setError((err as Error).message || "Upload failed.");
      setBusy(false);
    }
  }

  if (!file) {
    return (
      <label className="mx-auto flex max-w-lg cursor-pointer flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-16 text-center hover:bg-hover">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-hover">
          <UploadCloud className="h-9 w-9 text-fg-muted" />
        </span>
        <span className="text-base font-medium">Select a video to upload</span>
        <span className="text-sm text-fg-muted">
          MP4 or WebM, up to 512 MB. It plays as-is (no transcoding) in this demo.
        </span>
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
          }}
        />
      </label>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-3xl gap-6 md:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">Title (required)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 outline-none focus:border-accent"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={5000}
            className="w-full resize-y rounded-lg border border-border bg-transparent px-3 py-2.5 outline-none focus:border-accent"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-xs text-fg-muted">Visibility</span>
            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as (typeof VISIBILITIES)[number])
              }
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 outline-none focus:border-accent"
            >
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {v.charAt(0) + v.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-fg-muted">Category</span>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as (typeof CATEGORIES)[number])
              }
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 outline-none focus:border-accent"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        </div>

        {detectedShort ? (
          <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
            Vertical video detected - this will publish as a Wave.
          </p>
        ) : null}

        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3">
          <input
            type="checkbox"
            checked={membersOnly}
            onChange={(e) => setMembersOnly(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-accent"
          />
          <span className="text-sm">
            Members-only
            <span className="block text-xs text-fg-muted">
              Only your channel members can watch. Requires memberships enabled.
            </span>
          </span>
        </label>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        {busy ? (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-hover">
            <div
              className="h-full bg-accent transition-[width]"
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-full bg-accent px-5 py-2.5 font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
          >
            {busy ? `Uploading… ${Math.round(progress)}%` : "Publish"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setFile(null);
              setProgress(0);
            }}
            className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-hover disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>

      <aside className="flex flex-col gap-3">
        <span className="text-xs text-fg-muted">Thumbnail</span>
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-hover">
          {selectedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-fg-muted">
              Generating thumbnails…
            </div>
          )}
        </div>

        {posterUrls.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {posterUrls.map((u, i) => (
              <button
                type="button"
                key={u}
                onClick={() => setSelectedPoster(i)}
                className={cn(
                  "aspect-video overflow-hidden rounded-lg border-2",
                  selectedPoster === i ? "border-accent" : "border-transparent",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <label
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs hover:bg-hover",
            selectedPoster === -1
              ? "border-accent text-accent"
              : "border-border text-fg-muted",
          )}
        >
          <ImagePlus className="h-4 w-4" />
          {customThumbUrl ? "Custom thumbnail selected" : "Upload custom thumbnail"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onCustomThumb(f);
            }}
          />
        </label>

        <p className="truncate text-xs text-fg-muted">{file.name}</p>
      </aside>
    </form>
  );
}
