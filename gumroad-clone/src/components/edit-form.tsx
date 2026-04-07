// src/app/sell/products/[productId]/edit/edit-form.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, Check, Loader2, Save } from "lucide-react";
import { CATEGORIES } from "@/constants/categories";
import { formatFileSize } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";

interface ExistingFile {
  id: string;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

interface NewFile {
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

interface ProductData {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  content: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  files: ExistingFile[];
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
];
const MAX_FILE_SIZE = 16 * 1024 * 1024;

export function EditForm({ product }: { product: ProductData }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    product.thumbnailUrl
  );
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>(
    product.files
  );
  const [removedFileIds, setRemovedFileIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<NewFile[]>([]);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const { startUpload: startThumbnailUpload } = useUploadThing("productFile", {
    onClientUploadComplete: (res) => {
      if (res[0]) setThumbnailUrl(res[0].url);
      setUploadingThumbnail(false);
    },
    onUploadError: () => {
      setError("Thumbnail upload failed");
      setUploadingThumbnail(false);
    },
  });

  const { startUpload, isUploading } = useUploadThing("productFile", {
    onClientUploadComplete: (res) => {
      const uploaded = res.map((file) => ({
        fileName: file.name,
        fileKey: file.key,
        fileUrl: file.url,
        fileSize: file.size,
        mimeType: "",
      }));
      setNewFiles((prev) => [...prev, ...uploaded]);
    },
    onUploadError: (err) => {
      setError(err.message || "Upload failed");
    },
  });

  function removeExistingFile(fileId: string) {
    setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
    setRemovedFileIds((prev) => [...prev, fileId]);
  }

  function removeNewFile(fileKey: string) {
    setNewFiles((prev) => prev.filter((f) => f.fileKey !== fileKey));
  }

  async function handleFiles(fileList: FileList) {
    setError(null);
    const validFiles: File[] = [];
    for (const file of Array.from(fileList)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`${file.name}: file type not allowed`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: exceeds 16 MB limit`);
        return;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;

    const res = await startUpload(validFiles);
    if (res) {
      setNewFiles((prev) =>
        prev.map((f) => {
          if (f.mimeType) return f;
          const original = validFiles.find((v) => v.name === f.fileName);
          return original ? { ...f, mimeType: original.type } : f;
        })
      );
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const priceStr = formData.get("price") as string;
    const priceInCents = Math.round(parseFloat(priceStr || "0") * 100);

    const body: Record<string, unknown> = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      price: priceInCents,
      category: formData.get("category") as string,
      content: (formData.get("content") as string) || null,
      externalUrl: (formData.get("externalUrl") as string) || null,
      thumbnailUrl: thumbnailUrl || null,
    };

    if (removedFileIds.length > 0) body.removeFileIds = removedFileIds;
    if (newFiles.length > 0) body.files = newFiles;

    try {
      const res = await fetch(`/api/sell/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setSuccess(true);
      setRemovedFileIds([]);
      setNewFiles([]);
      setTimeout(() => setSuccess(false), 2000);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-error/10 p-3 text-sm text-error"
        >
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-text-primary"
        >
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          maxLength={100}
          defaultValue={product.title}
          className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-text-primary"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          maxLength={5000}
          defaultValue={product.description}
          className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* Price + Category */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="price"
            className="block text-sm font-medium text-text-primary"
          >
            Price (USD)
          </label>
          <input
            type="number"
            id="price"
            name="price"
            min="0"
            step="0.01"
            defaultValue={(product.price / 100).toFixed(2)}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-text-primary"
          >
            Category
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={product.category}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Thumbnail */}
      <div>
        <label className="block text-sm font-medium text-text-primary">
          Thumbnail
        </label>
        <p className="mt-0.5 text-xs text-text-secondary">
          Cover image shown on product cards. PNG, JPG, or WebP.
        </p>
        {thumbnailUrl && (
          <div className="mt-3 relative inline-block">
            <img
              src={thumbnailUrl}
              alt="Thumbnail"
              className="h-32 w-auto object-cover border border-border"
            />
            <button
              type="button"
              onClick={() => setThumbnailUrl(null)}
              aria-label="Remove thumbnail"
              className="absolute -right-2 -top-2 bg-error p-1 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {uploadingThumbnail && (
          <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </div>
        )}
        {!thumbnailUrl && !uploadingThumbnail && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 border border-dashed border-border p-4 text-sm text-text-secondary hover:border-accent/50 transition-colors">
            <Upload className="h-4 w-4" />
            Click to upload thumbnail
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingThumbnail(true);
                await startThumbnailUpload([file]);
              }}
            />
          </label>
        )}
      </div>

      {/* Files */}
      <div>
        <label className="block text-sm font-medium text-text-primary">
          Files
        </label>
        <p className="mt-0.5 text-xs text-text-secondary">
          PDF, images (PNG, JPG, GIF, WebP), video (MP4). Max 16 MB each.
        </p>

        {/* Existing files */}
        {existingFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            {existingFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
              >
                <Check
                  className="h-4 w-4 shrink-0 text-success"
                  aria-hidden="true"
                />
                <span className="flex-1 truncate text-sm text-text-primary">
                  {file.fileName}
                </span>
                <span className="text-xs text-text-secondary">
                  {formatFileSize(file.fileSize)}
                </span>
                <button
                  type="button"
                  onClick={() => removeExistingFile(file.id)}
                  aria-label={`Remove ${file.fileName}`}
                  className="p-2 text-text-secondary hover:text-error transition-colors"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New files */}
        {newFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            {newFiles.map((file) => (
              <div
                key={file.fileKey}
                className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3"
              >
                <Check
                  className="h-4 w-4 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <span className="flex-1 truncate text-sm text-text-primary">
                  {file.fileName}
                </span>
                <span className="text-xs text-text-secondary">
                  {formatFileSize(file.fileSize)}
                </span>
                <button
                  type="button"
                  onClick={() => removeNewFile(file.fileKey)}
                  aria-label={`Remove ${file.fileName}`}
                  className="p-2 text-text-secondary hover:text-error transition-colors"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Uploading indicator */}
        {isUploading && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-accent"
              aria-hidden="true"
            />
            <span className="text-sm text-text-secondary">Uploading...</span>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.dataset.dragging = "true";
          }}
          onDragLeave={(e) => {
            delete e.currentTarget.dataset.dragging;
          }}
          onDrop={(e) => {
            e.preventDefault();
            delete e.currentTarget.dataset.dragging;
            if (e.dataTransfer.files.length)
              handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-accent/50 data-[dragging]:border-accent data-[dragging]:bg-accent/5"
        >
          <Upload
            className="h-8 w-8 text-text-secondary"
            aria-hidden="true"
          />
          <span className="text-sm text-text-secondary">
            Click or drag files to upload
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.mp4"
            onChange={(e) =>
              e.target.files && handleFiles(e.target.files)
            }
            className="hidden"
          />
        </div>
      </div>

      {/* Text content */}
      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-text-primary"
        >
          Text Content{" "}
          <span className="text-text-secondary">(optional)</span>
        </label>
        <textarea
          id="content"
          name="content"
          rows={6}
          defaultValue={product.content || ""}
          className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 font-mono text-sm"
          placeholder="Add text or markdown content that buyers will see after purchase..."
        />
      </div>

      {/* External URL */}
      <div>
        <label
          htmlFor="externalUrl"
          className="block text-sm font-medium text-text-primary"
        >
          External Link{" "}
          <span className="text-text-secondary">(optional)</span>
        </label>
        <input
          type="url"
          id="externalUrl"
          name="externalUrl"
          defaultValue={product.externalUrl || ""}
          className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          placeholder="https://..."
        />
      </div>

      <button
        type="submit"
        disabled={saving || isUploading}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : success ? "Saved!" : "Save Changes"}
      </button>
    </form>
  );
}
