"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

interface Props {
  url: string | null;
  onChange: (next: { url: string; key: string } | null) => void;
}

export function CoverImagePicker({ url, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const { startUpload, isUploading } = useUploadThing("storyCover", {
    onClientUploadComplete: (files) => {
      const file = files?.[0];
      if (file?.ufsUrl) onChange({ url: file.ufsUrl, key: file.key });
    },
    onUploadError: (e) => setError(e.message),
  });

  function pick() {
    setError(null);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) await startUpload([file]);
    };
    input.click();
  }

  if (url) {
    return (
      <div className="relative group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Cover" className="w-full max-h-[420px] object-cover rounded-md" />
        <button
          type="button"
          aria-label="Remove cover image"
          onClick={() => onChange(null)}
          className="absolute top-3 right-3 size-9 rounded-full bg-background/90 hover:bg-background border border-border flex items-center justify-center"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={pick}
        disabled={isUploading}
        className={cn(
          "w-full px-4 py-3 rounded-pill inline-flex items-center gap-2 text-sm text-text-secondary border border-dashed border-border hover:border-text-primary hover:text-text-primary transition-colors",
          isUploading && "opacity-50",
        )}
      >
        <ImagePlus aria-hidden="true" className="size-4" />
        {isUploading ? "Uploading cover image…" : "Add a cover image"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
