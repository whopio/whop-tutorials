import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// Maximum avatar upload size in bytes. Vercel Blob's free tier handles
// much larger files; this cap is to prevent abuse and keep load times sane.
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export const dynamic = "force-dynamic";

// The browser-supplied file.type and file.name are both spoofable, so we never
// trust them. Sniff the leading magic bytes and derive the extension and
// content-type from the real format. SVG is intentionally unsupported (it can
// carry <script>). Returns the canonical extension, or null if unrecognized.
function sniffImage(bytes: Uint8Array): "jpg" | "png" | "webp" | "gif" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "gif";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "webp";
  return null;
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`avatar:${userId}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many uploads. Try again in a minute." },
      { status: 429 }
    );
  }

  const creator = await prisma.creator.findUnique({ where: { userId } });
  if (!creator) {
    return NextResponse.json(
      { error: "Save your profile first" },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be smaller than 4 MB" },
      { status: 413 }
    );
  }

  // Validate by content, not by the spoofable file.type / file.name.
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ext = sniffImage(head);
  if (!ext) {
    return NextResponse.json(
      { error: "Use a real JPG, PNG, WEBP, or GIF image" },
      { status: 415 }
    );
  }
  const contentType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;

  // Object key includes the creator ID so each creator only ever owns their
  // own slot. `addRandomSuffix` ensures repeated uploads don't collide
  // with the same cached URL.
  const blob = await put(`avatars/${creator.id}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });

  await prisma.creator.update({
    where: { id: creator.id },
    data: { avatarUrl: blob.url },
  });

  return NextResponse.json({ url: blob.url });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creator = await prisma.creator.findUnique({ where: { userId } });
  if (!creator) {
    return NextResponse.json(
      { error: "Save your profile first" },
      { status: 400 }
    );
  }

  await prisma.creator.update({
    where: { id: creator.id },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ ok: true });
}
