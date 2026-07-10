import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireChannel } from "@/lib/auth";
import { Uploader } from "./uploader";

export const metadata = { title: "Upload - Wavora Studio" };

export default async function UploadPage() {
  // Redirects to /sign-in or /create-channel as needed.
  await requireChannel();

  return (
    <div>
      <Link
        href="/studio/videos"
        className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to content
      </Link>
      <h1 className="mb-8 text-2xl font-bold">Upload video</h1>
      <Uploader />
    </div>
  );
}
