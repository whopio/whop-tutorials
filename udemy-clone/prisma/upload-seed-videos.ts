import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Mux from "@mux/mux-node";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

const VIDEO_MAP: Record<string, string> = {
  "Web Development Fundamentals": "video1-web-dev.mp4",
  "UI/UX Design Masterclass": "video2-design.mp4",
  "Marketing & Growth Strategy": "video3-marketing.mp4",
  "Data Science with Python": "video4-data-science.mp4",
  "Photography & Visual Arts": "video5-photography.mp4",
};

async function uploadAndWait(filePath: string): Promise<{
  assetId: string;
  playbackId: string;
  duration: number;
}> {
  const upload = await mux.video.uploads.create({
    cors_origin: APP_URL,
    new_asset_settings: {
      playback_policy: ["signed"],
      video_quality: "basic",
    },
  });

  const fileData = fs.readFileSync(filePath);
  const res = await fetch(upload.url!, {
    method: "PUT",
    body: fileData,
    headers: { "Content-Type": "video/mp4" },
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

  console.log("  Waiting for transcoding...");
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const status = await mux.video.uploads.retrieve(upload.id);
    if (status.asset_id) {
      const asset = await mux.video.assets.retrieve(status.asset_id);
      if (asset.status === "ready") {
        const playbackId = asset.playback_ids?.[0]?.id;
        if (!playbackId) throw new Error("No playback ID");
        return {
          assetId: asset.id,
          playbackId,
          duration: Math.round(asset.duration || 10),
        };
      }
    }
    process.stdout.write(".");
  }
  throw new Error("Timeout waiting for asset");
}

async function main() {
  console.log("=== Upload Videos to Seeded Courses ===\n");

  // Videos are in the project root's seed-videos dir (not relative to demo/code)
  const videosDir = path.resolve(
    __dirname,
    "../../../seed-videos"
  );
  console.log("Videos dir:", videosDir);

  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  for (const course of courses) {
    const videoFile = VIDEO_MAP[course.title];
    if (!videoFile) {
      console.log(`Skipping "${course.title}" — no video mapping`);
      continue;
    }

    const firstLesson = course.sections[0]?.lessons[0];
    if (!firstLesson) {
      console.log(`Skipping "${course.title}" — no lessons`);
      continue;
    }

    if (firstLesson.videoReady) {
      console.log(`Skipping "${course.title}" — already has video`);
      continue;
    }

    const videoPath = path.join(videosDir, videoFile);
    if (!fs.existsSync(videoPath)) {
      console.log(`Skipping "${course.title}" — video file not found: ${videoPath}`);
      continue;
    }

    console.log(`Uploading for "${course.title}"...`);
    const { assetId, playbackId, duration } = await uploadAndWait(videoPath);
    console.log(`\n  Asset: ${assetId}, Playback: ${playbackId}, Duration: ${duration}s`);

    await prisma.lesson.update({
      where: { id: firstLesson.id },
      data: {
        muxAssetId: assetId,
        muxPlaybackId: playbackId,
        duration,
        videoReady: true,
      },
    });
    console.log(`  ✓ Updated lesson "${firstLesson.title}"`);
  }

  console.log("\n=== Done ===");
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
