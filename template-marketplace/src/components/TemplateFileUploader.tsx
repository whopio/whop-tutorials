"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { File as FileIcon, Image as ImageIcon, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { UploadDropzone } from "@/lib/uploadthing";

export interface UploadedFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export function TemplateFileUploader({
  templateId,
  kind,
  files,
}: {
  templateId: string;
  kind: "preview" | "downloadable";
  files: UploadedFile[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            >
              {kind === "preview" ? (
                <Image
                  src={file.fileUrl}
                  alt=""
                  width={48}
                  height={48}
                  sizes="48px"
                  className="h-12 w-12 flex-shrink-0 rounded object-cover"
                />
              ) : (
                <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]">
                  {file.mimeType.startsWith("image/") ? (
                    <ImageIcon className="h-5 w-5" />
                  ) : (
                    <FileIcon className="h-5 w-5" />
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p
                  title={file.fileName}
                  className="truncate text-sm font-medium text-[var(--color-text-primary)]"
                >
                  {file.fileName}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {formatBytes(file.fileSize)}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await fetch(
                      `/api/sell/templates/${templateId}/files/${file.id}`,
                      { method: "DELETE" },
                    );
                    router.refresh();
                  });
                }}
                aria-label={`Remove ${file.fileName}`}
                className="flex-shrink-0 rounded-md p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <UploadDropzone
        endpoint={kind}
        input={{ templateId }}
        onClientUploadComplete={() => router.refresh()}
        onUploadError={(error: Error) => {
          alert(`Upload failed: ${error.message}`);
        }}
        appearance={{
          container:
            "rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/40 py-8 transition hover:border-[var(--color-accent)]",
          label: "text-[var(--color-text-primary)] font-medium",
          allowedContent: "text-xs text-[var(--color-text-secondary)]",
          button:
            "ut-ready:bg-[var(--color-accent)] ut-ready:hover:bg-[var(--color-accent-hover)] ut-ready:text-white ut-ready:rounded-lg ut-uploading:bg-[var(--color-accent-hover)] ut-uploading:text-white",
        }}
      />
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
