import { randomBytes } from "crypto";
import { prisma } from "./prisma";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function randomSuffix(length = 5): string {
  return randomBytes(8)
    .toString("base64")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .slice(0, length);
}

export async function generateSlug(title: string): Promise<string> {
  const base = slugify(title) || "template";

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomSuffix()}`;
    const taken = await prisma.template.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  return `template-${randomSuffix(8)}`;
}
