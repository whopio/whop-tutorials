import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Toggle like — create if not exists, delete if exists
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingLike = await prisma.like.findUnique({
    where: {
      userId_productId: {
        userId: session.userId,
        productId,
      },
    },
  });

  if (existingLike) {
    await prisma.like.delete({ where: { id: existingLike.id } });
    return NextResponse.json({ liked: false });
  }

  await prisma.like.create({
    data: {
      userId: session.userId,
      productId,
    },
  });

  return NextResponse.json({ liked: true });
}
