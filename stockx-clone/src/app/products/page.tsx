export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { ITEMS_PER_PAGE } from "@/constants";
import { ProductBrowse } from "@/components/ProductBrowse";
import { sortByCategoryPriority } from "@/lib/sort-products";

interface SearchParams {
  query?: string;
  category?: string;
  brand?: string;
  size?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
}

async function getProducts(params: SearchParams) {
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const skip = (page - 1) * ITEMS_PER_PAGE;
  const isDefaultSort = !params.sort;

  const where: Record<string, unknown> = {};

  if (params.query) {
    where.OR = [
      { name: { contains: params.query, mode: "insensitive" } },
      { brand: { contains: params.query, mode: "insensitive" } },
      { sku: { contains: params.query, mode: "insensitive" } },
    ];
  }

  if (params.category) {
    where.category = params.category;
  }

  if (params.brand) {
    where.brand = params.brand;
  }

  if (isDefaultSort) {
    // Fetch all matching products, sort by category priority in JS, then paginate
    const allProducts = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        sizes: {
          select: {
            lowestAsk: true,
            lastSalePrice: true,
          },
        },
      },
    });

    const sorted = sortByCategoryPriority(allProducts);
    return {
      products: sorted.slice(skip, skip + ITEMS_PER_PAGE),
      totalPages: Math.ceil(sorted.length / ITEMS_PER_PAGE),
      currentPage: page,
    };
  }

  // Explicit sort — use DB-level ordering + pagination
  let orderBy: Record<string, string> = { updatedAt: "desc" };
  switch (params.sort) {
    case "price-asc":
      orderBy = { retailPrice: "asc" };
      break;
    case "price-desc":
      orderBy = { retailPrice: "desc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: ITEMS_PER_PAGE,
      include: {
        sizes: {
          select: {
            lowestAsk: true,
            lastSalePrice: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    totalPages: Math.ceil(total / ITEMS_PER_PAGE),
    currentPage: page,
  };
}

async function getBrands() {
  const brands = await prisma.product.findMany({
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  return brands.map((b) => b.brand);
}

async function getSizes() {
  const sizes = await prisma.productSize.findMany({
    select: { size: true },
    distinct: ["size"],
    orderBy: { size: "asc" },
  });
  return sizes.map((s) => s.size);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [{ products, totalPages, currentPage }, brands, sizes] =
    await Promise.all([getProducts(params), getBrands(), getSizes()]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-100 mb-6">
        Browse Products
      </h1>
      <ProductBrowse
        initialProducts={products}
        totalPages={totalPages}
        currentPage={currentPage}
        brands={brands}
        sizes={sizes}
        initialParams={params as Record<string, string | undefined>}
      />
    </div>
  );
}
