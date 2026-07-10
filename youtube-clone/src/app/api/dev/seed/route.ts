import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { devRoutesEnabled } from "@/lib/env";

// TEMPORARY dev-only seeder — sandbox only, removed before production. Six demo
// channels: 15 grid videos + 21 vertical Shorts. Videos come from seed-videos.json
// (Higgsfield-generated clips on Vercel Blob) when present, else fall back to
// test-videos.co.uk; avatars/thumbnails are served from public/seed.
const CLIP = {
  bunny:
    "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_2MB.mp4",
  sintel:
    "https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_2MB.mp4",
  jelly:
    "https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_2MB.mp4",
} as const;

type ClipKey = keyof typeof CLIP;

// Generated Higgsfield clips, if scripts/seed-videos.mjs has produced them.
// Keyed by thumbnail basename (e.g. "novaclips-1", "novaclips-s1"); any video
// without a generated clip falls back to the sample CLIP below.
function loadGeneratedVideos(): Record<string, { url: string; durationSeconds: number; thumbUrl?: string }> {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "seed-videos.json"), "utf8"));
  } catch {
    return {};
  }
}
const thumbKey = (thumb: string) => thumb.split("/").pop()!.replace(/\.\w+$/, "");

type ChannelSeed = {
  whop: string;
  handle: string;
  name: string;
  bio: string;
  avatar: string;
};

const CHANNELS: ChannelSeed[] = [
  { whop: "demo_nova", handle: "novaclips", name: "Nova Clips", bio: "Cinematic shorts, film breakdowns, and VFX experiments.", avatar: "/seed/avatars/novaclips.png" },
  { whop: "demo_forge", handle: "pixelforge", name: "PixelForge", bio: "Game-dev devlogs, 3D renders, and engine deep-dives.", avatar: "/seed/avatars/pixelforge.png" },
  { whop: "demo_knead", handle: "dailyknead", name: "The Daily Knead", bio: "Sourdough, pastry, and everything that rises.", avatar: "/seed/avatars/dailyknead.png" },
  { whop: "demo_trail", handle: "trailhead", name: "Trailhead", bio: "Backcountry hikes, gear tests, and trail guides.", avatar: "/seed/avatars/trailhead.png" },
  { whop: "demo_synth", handle: "synthlab", name: "Synth Lab", bio: "Synthwave production, sound design, and modular jams.", avatar: "/seed/avatars/synthlab.png" },
  { whop: "demo_mind", handle: "mindthegap", name: "Mind the Gap", bio: "Science, explained - physics, space, and the very small.", avatar: "/seed/avatars/mindthegap.png" },
];

type VideoSeed = {
  ch: number;
  title: string;
  thumb: string;
  cat: string;
  clip: ClipKey;
  dur: number;
  views: number;
  days: number;
  short?: boolean;
};

const VIDEOS: VideoSeed[] = [
  // Nova Clips
  { ch: 0, title: "How we shot a one-take chase scene", thumb: "/seed/thumbnails/novaclips-1.png", cat: "ENTERTAINMENT", clip: "sintel", dur: 512, views: 1_820_000, days: 2 },
  { ch: 0, title: "Color grading a moody night exterior", thumb: "/seed/thumbnails/novaclips-2.png", cat: "TECH", clip: "bunny", dur: 734, views: 412_000, days: 6 },
  { ch: 0, title: "Anamorphic lenses - are they worth it?", thumb: "/seed/thumbnails/novaclips-3.png", cat: "TECH", clip: "jelly", dur: 623, views: 96_000, days: 12 },

  // PixelForge
  { ch: 1, title: "Building a voxel engine from scratch - Devlog 1", thumb: "/seed/thumbnails/pixelforge-1.png", cat: "GAMING", clip: "jelly", dur: 901, views: 540_000, days: 1 },
  { ch: 1, title: "Real-time global illumination, explained", thumb: "/seed/thumbnails/pixelforge-2.png", cat: "TECH", clip: "bunny", dur: 668, views: 88_400, days: 4 },
  { ch: 1, title: "Engine reveal in 30 seconds #waves", thumb: "/seed/thumbnails/pixelforge-3.png", cat: "GAMING", clip: "sintel", dur: 28, views: 1_200, days: 0, short: true },

  // The Daily Knead
  { ch: 2, title: "The only sourdough loaf recipe you need", thumb: "/seed/thumbnails/dailyknead-1.png", cat: "COOKING", clip: "bunny", dur: 842, views: 2_310_000, days: 3 },
  { ch: 2, title: "Laminating croissant dough (no-stress method)", thumb: "/seed/thumbnails/dailyknead-2.png", cat: "COOKING", clip: "sintel", dur: 1080, views: 178_000, days: 9 },
  { ch: 2, title: "Why your bread isn't rising - 5 fixes", thumb: "/seed/thumbnails/dailyknead-3.png", cat: "COOKING", clip: "jelly", dur: 421, views: 64_500, days: 16 },

  // Trailhead
  { ch: 3, title: "3 days solo in the alpine - full trip", thumb: "/seed/thumbnails/trailhead-1.png", cat: "SPORTS", clip: "jelly", dur: 1322, views: 730_000, days: 5 },
  { ch: 3, title: "Ultralight backpacking: my 9 lb base weight", thumb: "/seed/thumbnails/trailhead-2.png", cat: "SPORTS", clip: "bunny", dur: 793, views: 119_000, days: 11 },
  { ch: 3, title: "Summit reveal #waves", thumb: "/seed/thumbnails/trailhead-3.png", cat: "SPORTS", clip: "sintel", dur: 22, views: 305_000, days: 2, short: true },

  // Synth Lab
  { ch: 4, title: "Making an 80s synthwave track from scratch", thumb: "/seed/thumbnails/synthlab-1.png", cat: "MUSIC", clip: "sintel", dur: 967, views: 489_000, days: 4 },
  { ch: 4, title: "Designing a fat analog bass (free patch)", thumb: "/seed/thumbnails/synthlab-2.png", cat: "MUSIC", clip: "jelly", dur: 538, views: 73_000, days: 8 },
  { ch: 4, title: "Modular jam - rainy night session #waves", thumb: "/seed/thumbnails/synthlab-3.png", cat: "MUSIC", clip: "bunny", dur: 41, views: 22_900, days: 1, short: true },

  // Mind the Gap
  { ch: 5, title: "Why is the sky actually blue? (it's not what you think)", thumb: "/seed/thumbnails/mindthegap-1.png", cat: "EDUCATION", clip: "bunny", dur: 489, views: 9_240_000, days: 7 },
  { ch: 5, title: "Quantum entanglement, without the hype", thumb: "/seed/thumbnails/mindthegap-2.png", cat: "EDUCATION", clip: "sintel", dur: 803, views: 1_410_000, days: 14 },
  { ch: 5, title: "How big is the universe, really?", thumb: "/seed/thumbnails/mindthegap-3.png", cat: "EDUCATION", clip: "jelly", dur: 712, views: 2_050_000, days: 21 },

  // ── Extra Shorts (9:16) — 3 per channel; thumbnails in /seed/thumbnails/shorts ──
  // Nova Clips
  { ch: 0, title: "Nailing the perfect focus pull", thumb: "/seed/thumbnails/shorts/novaclips-s1.png", cat: "ENTERTAINMENT", clip: "sintel", dur: 24, views: 842_000, days: 3, short: true },
  { ch: 0, title: "One light, ten-thousand-dollar look", thumb: "/seed/thumbnails/shorts/novaclips-s2.png", cat: "ENTERTAINMENT", clip: "jelly", dur: 38, views: 1_240_000, days: 8, short: true },
  { ch: 0, title: "Hide your cuts with a whip pan", thumb: "/seed/thumbnails/shorts/novaclips-s3.png", cat: "ENTERTAINMENT", clip: "bunny", dur: 31, views: 596_000, days: 14, short: true },

  // PixelForge
  { ch: 1, title: "Shader toy: melting chrome", thumb: "/seed/thumbnails/shorts/pixelforge-s1.png", cat: "GAMING", clip: "jelly", dur: 19, views: 410_000, days: 2, short: true },
  { ch: 1, title: "1000 cubes from one line of code", thumb: "/seed/thumbnails/shorts/pixelforge-s2.png", cat: "GAMING", clip: "sintel", dur: 27, views: 233_000, days: 6, short: true },
  { ch: 1, title: "Why your game runs at 12 FPS", thumb: "/seed/thumbnails/shorts/pixelforge-s3.png", cat: "GAMING", clip: "bunny", dur: 44, views: 712_000, days: 10, short: true },

  // The Daily Knead
  { ch: 2, title: "The windowpane test, explained", thumb: "/seed/thumbnails/shorts/dailyknead-s1.png", cat: "COOKING", clip: "bunny", dur: 33, views: 1_510_000, days: 1, short: true },
  { ch: 2, title: "How to score a sourdough loaf", thumb: "/seed/thumbnails/shorts/dailyknead-s2.png", cat: "COOKING", clip: "sintel", dur: 21, views: 884_000, days: 5, short: true },
  { ch: 2, title: "Croissant vs cronut", thumb: "/seed/thumbnails/shorts/dailyknead-s3.png", cat: "COOKING", clip: "jelly", dur: 17, views: 2_020_000, days: 12, short: true },

  // Trailhead
  { ch: 3, title: "60 seconds of pure ridgeline", thumb: "/seed/thumbnails/shorts/trailhead-s1.png", cat: "SPORTS", clip: "jelly", dur: 58, views: 333_000, days: 4, short: true },
  { ch: 3, title: "Pack this, not that", thumb: "/seed/thumbnails/shorts/trailhead-s2.png", cat: "SPORTS", clip: "bunny", dur: 29, views: 147_000, days: 9, short: true },
  { ch: 3, title: "Sunrise that was worth the 4am start", thumb: "/seed/thumbnails/shorts/trailhead-s3.png", cat: "SPORTS", clip: "sintel", dur: 23, views: 905_000, days: 15, short: true },

  // Synth Lab
  { ch: 4, title: "This bassline goes hard", thumb: "/seed/thumbnails/shorts/synthlab-s1.png", cat: "MUSIC", clip: "sintel", dur: 26, views: 488_000, days: 3, short: true },
  { ch: 4, title: "Turn any sound into a pad", thumb: "/seed/thumbnails/shorts/synthlab-s2.png", cat: "MUSIC", clip: "jelly", dur: 35, views: 176_000, days: 7, short: true },
  { ch: 4, title: "80s drums in 30 seconds", thumb: "/seed/thumbnails/shorts/synthlab-s3.png", cat: "MUSIC", clip: "bunny", dur: 30, views: 642_000, days: 11, short: true },

  // Mind the Gap
  { ch: 5, title: "Why ice floats", thumb: "/seed/thumbnails/shorts/mindthegap-s1.png", cat: "EDUCATION", clip: "bunny", dur: 41, views: 3_100_000, days: 2, short: true },
  { ch: 5, title: "The Moon is drifting away", thumb: "/seed/thumbnails/shorts/mindthegap-s2.png", cat: "EDUCATION", clip: "sintel", dur: 47, views: 1_870_000, days: 9, short: true },
  { ch: 5, title: "You're mostly empty space", thumb: "/seed/thumbnails/shorts/mindthegap-s3.png", cat: "EDUCATION", clip: "jelly", dur: 39, views: 2_450_000, days: 18, short: true },
];

export async function GET(request: Request) {
  if (!devRoutesEnabled()) {
    return NextResponse.json({ error: "sandbox only" }, { status: 403 });
  }
  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== "wavora") {
    return NextResponse.json({ error: "add ?confirm=wavora" }, { status: 400 });
  }

  // Reset previous demo + stray test data (cascade removes channels + videos).
  await prisma.user.deleteMany({
    where: {
      OR: [
        { whopUserId: { startsWith: "demo_" } },
        { whopUserId: { contains: "test" } },
        { whopUserId: { contains: "qa_" } },
        { whopUserId: { contains: "probe" } },
      ],
    },
  });

  const channelIds: string[] = [];
  for (const c of CHANNELS) {
    const user = await prisma.user.create({
      data: { whopUserId: c.whop, username: c.handle, name: c.name },
    });
    const channel = await prisma.channel.create({
      data: {
        userId: user.id,
        handle: c.handle,
        name: c.name,
        description: c.bio,
        avatarUrl: c.avatar,
      },
    });
    channelIds.push(channel.id);
  }

  const generated = loadGeneratedVideos();
  let count = 0;
  for (const v of VIDEOS) {
    const ch = CHANNELS[v.ch];
    const key = thumbKey(v.thumb);
    const gen = generated[key];
    await prisma.video.create({
      data: {
        channelId: channelIds[v.ch],
        title: v.title,
        description: `${ch.name} - ${v.title}.`,
        category: v.cat as never,
        visibility: "PUBLIC",
        status: "READY",
        videoUrl: gen?.url ?? CLIP[v.clip],
        videoPathname: gen ? `seed/videos/${key}.mp4` : "demo/sample.mp4",
        thumbnailUrl: gen?.thumbUrl ?? v.thumb,
        durationSeconds: v.dur,
        isShort: v.short ?? false,
        viewCount: v.views,
        publishedAt: new Date(Date.now() - v.days * 86_400_000),
      },
    });
    count++;
  }

  return NextResponse.json({ channels: channelIds.length, videos: count });
}
