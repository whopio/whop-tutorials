import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { whopsdk } from "@/lib/whop";
import { isSandbox } from "@/lib/env";
import { requireCreator } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Store a creator image and return a URL to save on their profile. In production
// we push it to Whop's Files API, whose `upload` helper creates the file, uploads
// the bytes to a presigned S3 URL, and polls until it is ready, returning a
// permanent public CDN url. Whop's sandbox accepts the upload but never finishes
// processing the file (it stays "pending" with no url), so in sandbox we resize
// the image and return it as a data URL instead.
export async function POST(req: NextRequest) {
  if (!rateLimit(`creator-upload:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  await requireCreator();

  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, WEBP or GIF images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
  }

  try {
    if (isSandbox()) {
      const input = Buffer.from(await file.arrayBuffer());
      const out = await sharp(input)
        .rotate()
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
      return NextResponse.json({ url: `data:image/webp;base64,${out.toString("base64")}` });
    }

    const uploaded = await whopsdk.files.upload(file, { filename: file.name || "upload" });
    if (!uploaded.url) {
      return NextResponse.json({ error: "Upload did not finish" }, { status: 502 });
    }
    return NextResponse.json({ url: uploaded.url });
  } catch (err: unknown) {
    console.error("File upload failed:", err);
    return NextResponse.json({ error: "Could not upload the image" }, { status: 502 });
  }
}
