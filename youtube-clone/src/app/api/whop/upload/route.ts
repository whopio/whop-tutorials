import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { uploadImageToWhop } from "@/lib/whop-files";
import { rateLimit } from "@/lib/rate-limit";

// Channel avatars/banners upload through our server to Whop's files endpoint.
// These are small images that sit well under Vercel's 4.5MB serverless body
// limit; videos still go client-direct to Blob (see /api/blob/upload) precisely
// because they don't.
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Detect the real image type from the leading magic bytes — a client-declared
 * Content-Type is trivially spoofed (a non-image wrapped as image/png). Returns
 * the sniffed type, or null if the bytes aren't a supported image.
 */
function sniffImageType(b: Uint8Array): string | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38)
    return "image/gif";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return "image/webp";
  return null;
}

/**
 * CHANNEL-6/7: upload a channel image (avatar or banner) to Whop's files
 * endpoint. Authorized to a signed-in user who owns a channel; returns the
 * public media.whop.com URL for the customize form to persist via updateChannel.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });
    }
    const channel = await prisma.channel.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!channel) {
      return NextResponse.json(
        { error: "Create a channel before uploading." },
        { status: 403 },
      );
    }

    const rl = rateLimit(`whop-upload:${user.id}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many uploads - try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Upload a JPEG, PNG, WebP, or GIF image." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be 4MB or smaller." },
        { status: 400 },
      );
    }

    // Verify the bytes actually are an image (not just the declared MIME type).
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!sniffImageType(head)) {
      return NextResponse.json(
        { error: "That file isn't a valid image." },
        { status: 400 },
      );
    }

    const url = await uploadImageToWhop(file);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Whop file upload failed", err);
    return NextResponse.json(
      { error: (err as Error).message || "Upload failed." },
      { status: 500 },
    );
  }
}
