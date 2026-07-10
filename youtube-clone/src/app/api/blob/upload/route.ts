import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Demo cap. Vercel Blob supports up to 5TB via multipart; we keep uploads small
// for the free tier. Production would also add a transcoding step (see CLAUDE.md).
const MAX_BYTES = 512 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "image/jpeg",
  "image/png",
  "image/webp",
];

/**
 * VIDEO-1: mint a short-lived client-upload token so the browser uploads the
 * file directly to Vercel Blob (bypassing the 4.5MB server-body limit). We
 * authorize here: only a signed-in user who owns a channel may upload.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await getCurrentUser();
        if (!user) throw new Error("You must be signed in to upload.");
        const channel = await prisma.channel.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        if (!channel) throw new Error("Create a channel before uploading.");

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ channelId: channel.id }),
        };
      },
      onUploadCompleted: async () => {
        // Vercel only calls this over a public HTTPS URL (never localhost), so
        // we persist the Video row from the client after upload finishes
        // instead — see src/app/studio/actions.ts (createVideo).
      },
    });

    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
