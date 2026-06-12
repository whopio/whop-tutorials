"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@whop/react/components";
import { Check } from "@/components/Icons";

const MAX_BYTES = 5 * 1024 * 1024;

export default function ImageUploadField({
  label,
  field,
  value,
  onChange,
  round,
}: {
  label: string;
  field: "coverImageUrl" | "avatarUrl";
  value: string;
  onChange: (url: string) => void;
  round?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist just this field right away so the image appears on the profile and
  // dashboard without waiting for the form's Save button.
  async function persist(url: string) {
    await fetch("/api/creator/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: url }),
    });
    onChange(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 5 MB.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/creator/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Upload failed");
        setBusy(false);
        return;
      }
      await persist(data.url);
    } catch {
      setError("Upload failed. Please try again.");
    }
    setBusy(false);
  }

  async function onRemove() {
    setBusy(true);
    setError(null);
    try {
      await persist("");
    } catch {
      setError("Could not remove the image");
    }
    setBusy(false);
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-4">
        <div
          className={`grid shrink-0 place-items-center overflow-hidden border border-line bg-surface-2 ${
            round ? "h-16 w-16 rounded-full" : "h-16 w-28 rounded-xl"
          }`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-xs text-muted">No image</span>
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <Button
            type="button"
            size="2"
            variant="surface"
            color="gray"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
          </Button>
          {value ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="text-xs text-muted hover:text-ink"
            >
              Remove
            </button>
          ) : null}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
        {saved ? (
          <span className="inline-flex items-center gap-1 text-sm text-positive">
            <Check className="h-4 w-4" /> Saved
          </span>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
