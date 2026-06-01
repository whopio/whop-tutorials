import { prisma } from "@/lib/prisma";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Slug is scoped per author — `/@alice/hello` and `/@bob/hello` can both exist.
export async function generateStorySlug(
  authorUserId: string,
  title: string,
  excludeStoryId?: string,
): Promise<string> {
  const base = slugify(title) || "untitled";
  let candidate = base;
  let attempt = 0;
  while (true) {
    const existing = await prisma.story.findUnique({
      where: { authorUserId_slug: { authorUserId, slug: candidate } },
      select: { id: true },
    });
    if (!existing || existing.id === excludeStoryId) return candidate;
    attempt += 1;
    const suffix = Math.random().toString(36).slice(2, 6);
    candidate = `${base}-${suffix}`;
    if (attempt > 6) return `${base}-${Date.now().toString(36)}`;
  }
}
