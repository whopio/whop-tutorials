// src/app/api/sell/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const updateProfileSchema = z.object({
  headline: z.string().max(100).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!profile) {
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const updated = await prisma.sellerProfile.update({
    where: { id: profile.id },
    data: {
      headline: parsed.data.headline ?? null,
      bio: parsed.data.bio ?? null,
    },
  });

  return NextResponse.json(updated);
}
