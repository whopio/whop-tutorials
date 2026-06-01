import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Render per-request (cached 1h on Vercel) so `next build` doesn't need a live DB.
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://storyline.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stories, writers, topics] = await Promise.all([
    prisma.story.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 5000,
      select: { slug: true, updatedAt: true, author: { select: { username: true } } },
    }),
    prisma.user.findMany({
      where: { stories: { some: { status: "PUBLISHED" } } },
      select: { username: true, updatedAt: true },
    }),
    prisma.topic.findMany({ select: { slug: true } }),
  ]);

  const stat: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/membership`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/topics`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const storyUrls: MetadataRoute.Sitemap = stories.map((s) => ({
    url: `${BASE}/@${s.author.username}/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const writerUrls: MetadataRoute.Sitemap = writers.map((w) => ({
    url: `${BASE}/@${w.username}`,
    lastModified: w.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const topicUrls: MetadataRoute.Sitemap = topics.map((t) => ({
    url: `${BASE}/tag/${t.slug}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...stat, ...storyUrls, ...writerUrls, ...topicUrls];
}
