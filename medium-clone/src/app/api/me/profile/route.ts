import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ProfileSchema = z.object({
  headline: z.string().max(140).nullable().optional(),
  bio: z.string().max(700).nullable().optional(),
});

function cleanOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const parsed = ProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }

  const headline = cleanOptionalText(parsed.data.headline);
  const bio = cleanOptionalText(parsed.data.bio);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(headline !== undefined ? { headline } : {}),
      ...(bio !== undefined ? { bio } : {}),
    },
    select: {
      headline: true,
      bio: true,
    },
  });

  return NextResponse.json({ profile: updated });
}
