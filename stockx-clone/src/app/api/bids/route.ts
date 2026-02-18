import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BidStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { matchBid } from "@/lib/matching-engine";
import { rateLimit } from "@/lib/rate-limit";
import { MIN_BID_PRICE, MAX_BID_PRICE, ITEMS_PER_PAGE } from "@/constants";

const createBidSchema = z.object({
  productSizeId: z.string().min(1, "Product size is required"),
  price: z
    .number()
    .positive("Price must be positive")
    .min(MIN_BID_PRICE, `Minimum bid is $${MIN_BID_PRICE}`)
    .max(MAX_BID_PRICE, `Maximum bid is $${MAX_BID_PRICE}`)
    .refine(
      (val) => Number(val.toFixed(2)) === val,
      "Price must have at most 2 decimal places"
    ),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request);
    if (limited) return limited;

    const user = await requireAuth();

    const body: unknown = await request.json();
    const parsed = createBidSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productSizeId, price, expiresAt } = parsed.data;

    const productSize = await prisma.productSize.findUnique({
      where: { id: productSizeId },
    });

    if (!productSize) {
      return NextResponse.json(
        { error: "Product size not found" },
        { status: 404 }
      );
    }

    const bid = await prisma.bid.create({
      data: {
        userId: user.id,
        productSizeId,
        price,
        status: BidStatus.ACTIVE,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    const trade = await matchBid(bid.id);

    return NextResponse.json(
      {
        bid,
        matched: trade !== null,
        trade: trade ?? undefined,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.error("Failed to create bid:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productSizeId = searchParams.get("productSizeId");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

    if (!productSizeId) {
      return NextResponse.json(
        { error: "productSizeId is required" },
        { status: 400 }
      );
    }

    const [bids, total] = await Promise.all([
      prisma.bid.findMany({
        where: {
          productSizeId,
          status: BidStatus.ACTIVE,
        },
        orderBy: { price: "desc" },
        take: ITEMS_PER_PAGE,
        skip: (page - 1) * ITEMS_PER_PAGE,
        include: {
          user: { select: { id: true, username: true, displayName: true } },
        },
      }),
      prisma.bid.count({
        where: { productSizeId, status: BidStatus.ACTIVE },
      }),
    ]);

    return NextResponse.json({
      bids,
      pagination: {
        page,
        pageSize: ITEMS_PER_PAGE,
        total,
        totalPages: Math.ceil(total / ITEMS_PER_PAGE),
      },
    });
  } catch (error: unknown) {
    console.error("Failed to fetch bids:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
