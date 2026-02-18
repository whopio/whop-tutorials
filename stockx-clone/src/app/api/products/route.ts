import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ITEMS_PER_PAGE, CATEGORIES } from "@/constants";

const querySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name"]).default("newest"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(ITEMS_PER_PAGE),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      brand: searchParams.get("brand") ?? undefined,
      sort: searchParams.get("sort") ?? "newest",
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? ITEMS_PER_PAGE,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { search, category, brand, sort, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category && (CATEGORIES as readonly string[]).includes(category)) {
      where.category = category;
    }

    if (brand) {
      where.brand = { contains: brand, mode: "insensitive" };
    }

    let orderBy: Record<string, string> = { createdAt: "desc" };
    switch (sort) {
      case "price_asc":
        orderBy = { retailPrice: "asc" };
        break;
      case "price_desc":
        orderBy = { retailPrice: "desc" };
        break;
      case "name":
        orderBy = { name: "asc" };
        break;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          sizes: {
            select: {
              id: true,
              size: true,
              lowestAsk: true,
              highestBid: true,
              lastSalePrice: true,
              salesCount: true,
            },
            orderBy: { size: "asc" },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
