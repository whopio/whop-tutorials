// src/app/api/products/[productId]/rate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const VALID_RATINGS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

const rateSchema = z.object({
  cookies: z.number().refine((v) => VALID_RATINGS.includes(v), {
    message: "Rating must be 0.5-5 in 0.5 increments",
  }),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const purchase = await prisma.purchase.findUnique({
    where: { userId_productId: { userId: session.userId, productId } },
  });
  if (!purchase) {
    return NextResponse.json({ error: "Purchase required" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = rateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  const rating = await prisma.rating.upsert({
    where: { userId_productId: { userId: session.userId, productId } },
    create: { userId: session.userId, productId, cookies: parsed.data.cookies },
    update: { cookies: parsed.data.cookies },
  });

  return NextResponse.json(rating);
}
