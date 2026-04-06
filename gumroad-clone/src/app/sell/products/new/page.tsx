// src/app/sell/products/new/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, Check, Loader2 } from "lucide-react";
import { CATEGORIES } from "@/constants/categories";
import { formatFileSize } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
];
const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16 MB

interface UploadedFile {
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const { startUpload, isUploading } = useUploadThing("productFile", {
    onClientUploadComplete: (res) => {
      const uploaded = res.map((file) => ({
        fileName: file.name,
        fileKey: file.key,
        fileUrl: file.url,
        fileSize: file.size,
        mimeType: "", // filled from the original File object below
      }));
      setFiles((prev) => [...prev, ...uploaded]);
    },
    onUploadError: (err) => {
      setError(err.message || "Upload failed");
    },
  });

  function removeFile(fileKey: string) {
    setFiles((prev) => prev.filter((f) => f.fileKey !== fileKey));
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
      // Patch in the MIME types from the original File objects
      setFiles((prev) =>
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
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const priceStr = formData.get("price") as string;
    const priceInCents = Math.round(parseFloat(priceStr || "0") * 100);

    const body = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      price: priceInCents,
      category: formData.get("category") as string,
      content: (formData.get("content") as string) || undefined,
      externalUrl: (formData.get("externalUrl") as string) || undefined,
      files: files.length > 0 ? files : undefined,
    };

    try {
      const res = await fetch("/api/sell/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create product");
        return;
      }

      const product = await res.json();
      router.push(`/sell/products/${product.id}/edit`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary">
        Create a New Product
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Fill in the details, upload your files, and publish when ready.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-error/10 p-3 text-sm text-error"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            placeholder="e.g. Premium Icon Pack"
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
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            placeholder="Describe what buyers will get..."
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
              defaultValue="0"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="0.00 for free"
            />
            <p className="mt-1 text-xs text-text-secondary">
              Set to 0 for a free product
            </p>
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

        {/* Files */}
        <div>
          <label className="block text-sm font-medium text-text-primary">
            Files
          </label>
          <p className="mt-0.5 text-xs text-text-secondary">
            PDF, images (PNG, JPG, GIF, WebP), video (MP4). Max 16 MB each.
          </p>

          {/* Completed uploads */}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file) => (
                <div
                  key={file.fileKey}
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
                    onClick={() => removeFile(file.fileKey)}
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
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            placeholder="https://..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || isUploading}
          className="w-full rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Product (Draft)"}
        </button>
      </form>
    </div>
  );
}
