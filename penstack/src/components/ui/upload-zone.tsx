"use client";

import { generateUploadDropzone } from "@uploadthing/react";
import type { UploadRouter } from "@/lib/uploadthing";

const UploadDropzone = generateUploadDropzone<UploadRouter>();

interface UploadZoneProps {
  endpoint: keyof UploadRouter;
  onUploadComplete: (url: string) => void;
  label?: string;
}

export function UploadZone({
  endpoint,
  onUploadComplete,
  label = "Upload an image",
}: UploadZoneProps) {
  return (
    <div className="w-full">
      {label && (
        <p className="mb-2 text-sm font-medium text-gray-700">{label}</p>
      )}
      <UploadDropzone
        endpoint={endpoint}
        onClientUploadComplete={(res) => {
          if (res?.[0]?.ufsUrl) {
            onUploadComplete(res[0].ufsUrl);
          }
        }}
        onUploadError={(error: Error) => {
          alert(`Upload failed: ${error.message}`);
        }}
        appearance={{
          container:
            "border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors cursor-pointer",
          label: "text-sm text-gray-600",
          allowedContent: "text-xs text-gray-400",
          button: "btn-primary text-sm",
        }}
      />
    </div>
  );
}
