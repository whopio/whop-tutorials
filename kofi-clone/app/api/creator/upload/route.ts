import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { whopsdk } from "@/lib/whop";
import { isSandbox } from "@/lib/env";
import { requireCreator } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Store a creator image and return a URL to save on their profile. In production
// we create a public file with Whop's Files API, PUT the bytes to its presigned
// upload URL, and poll until it is ready, which gives a permanent public CDN url.
// In sandbox we resize the image and return it as a data URL instead, so local
// development never waits on Whop's file processing.
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

    const created = await whopsdk.files.create({ filename: file.name || "upload", visibility: "public" });
    if (!created.upload_url) throw new Error(`File ${created.id} has no upload URL`);
    const put = await fetch(created.upload_url, {
      method: "PUT",
      headers: created.upload_headers as Record<string, string> | undefined,
      body: file,
    });
    if (!put.ok) throw new Error(`Upload failed with status ${put.status}`);

    let uploaded = await whopsdk.files.retrieve({ id: created.id });
    for (let i = 0; i < 10 && uploaded.upload_status !== "ready" && uploaded.upload_status !== "failed"; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      uploaded = await whopsdk.files.retrieve({ id: created.id });
    }
    if (uploaded.upload_status !== "ready" || !uploaded.url) {
      return NextResponse.json({ error: "Upload did not finish" }, { status: 502 });
    }
    return NextResponse.json({ url: uploaded.url });
  } catch (err: unknown) {
    console.error("File upload failed:", err);
    return NextResponse.json({ error: "Could not upload the image" }, { status: 502 });
  }
}
