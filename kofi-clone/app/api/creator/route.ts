import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createConnectedCompany } from "@/services/whop";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { DEFAULT_ACCENT } from "@/lib/accent";
import { CREATOR_CATEGORIES } from "@/constants";
import { usernameSchema, RESERVED_USERNAMES } from "@/lib/username";

const schema = z.object({
  username: usernameSchema,
  displayName: z.string().min(1).max(60),
  bio: z.string().max(500).optional(),
  tags: z.array(z.string().max(40)).max(8).optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(`creator:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.creator) return NextResponse.json({ error: "You already have a page" }, { status: 400 });

  const body: unknown = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { username, displayName, bio, tags } = parsed.data;
  const allowed = new Set<string>(CREATOR_CATEGORIES);
  const cleanTags = (tags ?? []).filter((t) => allowed.has(t));

  if (RESERVED_USERNAMES.has(username)) {
    return NextResponse.json({ error: "That username is reserved" }, { status: 409 });
  }
  const existing = await prisma.creator.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "That username is taken" }, { status: 409 });
  }

  let whopCompanyId: string | null = null;
  try {
    whopCompanyId = await createConnectedCompany({
      email: user.email ?? `${username}@example.com`,
      title: displayName,
      internalUserId: user.id,
    });
  } catch (err: unknown) {
    console.error("Failed to create connected company:", err);
    return NextResponse.json(
      { error: "We couldn't set up your payments account. Please try again." },
      { status: 502 },
    );
  }

  const creator = await prisma.creator.create({
    data: {
      userId: user.id,
      username,
      displayName,
      bio: bio || null,
      tags: cleanTags,
      whopCompanyId,
      // The connected company exists at this point, so the page can go live in
      // discovery (homepage, /explore, /feed all filter on whopOnboarded).
      whopOnboarded: true,
      accentColor: DEFAULT_ACCENT,
    },
  });

  return NextResponse.json({ ok: true, username: creator.username });
}
