import { prisma } from "./prisma";
import type { Tool, Category } from "@/generated/prisma/client";

export const PAGE_SIZE = 12;

export type SortOption = "recent" | "popular";

export interface TemplateListFilters {
  tool?: Tool;
  category?: Category;
  q?: string;
  sellerProfileId?: string;
  page?: number;
  sort?: SortOption;
  pageSize?: number;
}

export interface TemplateCardSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  tool: Tool;
  category: Category;
  thumbnailUrl: string | null;
  deliveryType: "FILE_DOWNLOAD" | "SHARE_URL";
  fileCount: number;
  reviewCount: number;
  avgRating: number | null;
  seller: {
    username: string;
    headline: string | null;
  };
}

export async function listPublishedTemplates(
  filters: TemplateListFilters = {},
): Promise<{ items: TemplateCardSummary[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where = {
    status: "PUBLISHED" as const,
    ...(filters.tool && { tool: filters.tool }),
    ...(filters.category && { category: filters.category }),
    ...(filters.sellerProfileId && { sellerProfileId: filters.sellerProfileId }),
    ...(filters.q && {
      OR: [
        { title: { contains: filters.q, mode: "insensitive" as const } },
        { description: { contains: filters.q, mode: "insensitive" as const } },
      ],
    }),
  };

  const orderBy =
    filters.sort === "popular"
      ? [{ purchases: { _count: "desc" as const } }, { createdAt: "desc" as const }]
      : [{ createdAt: "desc" as const }];

  const [rows, total] = await Promise.all([
    prisma.template.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        sellerProfile: { select: { username: true, headline: true } },
        _count: { select: { files: true, reviews: true } },
        reviews: { select: { stars: true } },
      },
    }),
    prisma.template.count({ where }),
  ]);

  const items: TemplateCardSummary[] = rows.map((t) => {
    const ratingSum = t.reviews.reduce((s, r) => s + r.stars, 0);
    const avgRating = t.reviews.length > 0 ? ratingSum / t.reviews.length : null;
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      description: t.description,
      price: t.price,
      tool: t.tool,
      category: t.category,
      thumbnailUrl: t.thumbnailUrl,
      deliveryType: t.deliveryType,
      fileCount: t._count.files,
      reviewCount: t._count.reviews,
      avgRating,
      seller: {
        username: t.sellerProfile.username,
        headline: t.sellerProfile.headline,
      },
    };
  });

  return { items, total, page, pageSize };
}

export async function getTemplateBySlug(slug: string) {
  return prisma.template.findUnique({
    where: { slug },
    include: {
      sellerProfile: {
        select: { username: true, headline: true, bio: true, userId: true },
      },
      files: { orderBy: { displayOrder: "asc" } },
      reviews: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          stars: true,
          title: true,
          body: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });
}
