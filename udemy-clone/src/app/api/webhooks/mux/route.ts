import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMux } from "@/lib/mux";

export async function POST(request: NextRequest) {
  const body = await request.text();

  const signature = request.headers.get("mux-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  type MuxEvent = {
    type: string;
    id: string;
    data: Record<string, unknown>;
  };

  let event: MuxEvent;
  try {
    const mux = getMux();
    event = mux.webhooks.unwrap(
      body,
      { "mux-signature": signature },
      process.env.MUX_WEBHOOK_SECRET!
    ) as unknown as MuxEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const existing = await prisma.webhookEvent.findUnique({
    where: { id: event.id },
  });
  if (existing) {
    return NextResponse.json({ received: true });
  }

  await prisma.webhookEvent.create({
    data: { id: event.id, source: "mux" },
  });

  if (event.type === "video.asset.ready") {
    const asset = event.data as {
      id: string;
      passthrough?: string;
      duration?: number;
      playback_ids?: Array<{ id: string; policy: string }>;
    };

    if (asset.passthrough) {
      await prisma.lesson.update({
        where: { id: asset.passthrough },
        data: {
          muxAssetId: asset.id,
          muxPlaybackId: asset.playback_ids?.[0]?.id ?? null,
          duration: asset.duration ? Math.round(asset.duration) : null,
          videoReady: true,
        },
      });
    }
  }

  if (event.type === "video.upload.asset_created") {
    const upload = event.data as { asset_id?: string; id?: string };
    if (upload.asset_id && upload.id) {
      await prisma.lesson.updateMany({
        where: { muxUploadId: upload.id },
        data: { muxAssetId: upload.asset_id },
      });
    }
  }

  return NextResponse.json({ received: true });
}
