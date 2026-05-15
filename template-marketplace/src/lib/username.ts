import { randomBytes } from "crypto";
import { prisma } from "./prisma";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function randomSuffix(length = 4): string {
  return randomBytes(8)
    .toString("base64")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .slice(0, length);
}

/**
 * Generate a unique URL-friendly username for a SellerProfile.
 * Tries the seed slug first, then appends random suffixes on collision.
 * Falls back to a fully-random name after 5 attempts.
 */
export async function generateUsername(seed: string): Promise<string> {
  const base = slugify(seed) || "seller";

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomSuffix()}`;
    const taken = await prisma.sellerProfile.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  return `seller-${randomSuffix(8)}`;
}
