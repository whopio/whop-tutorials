import { CATEGORY_PRIORITY } from "@/constants";

interface SortableProduct {
  category: string;
  updatedAt: Date;
}

export function sortByCategoryPriority<T extends SortableProduct>(
  products: T[]
): T[] {
  return products.slice().sort((a, b) => {
    const pa = CATEGORY_PRIORITY[a.category] ?? Infinity;
    const pb = CATEGORY_PRIORITY[b.category] ?? Infinity;
    if (pa !== pb) return pa - pb;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}
