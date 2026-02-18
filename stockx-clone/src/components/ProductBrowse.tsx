"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { Pagination } from "@/components/Pagination";

interface Product {
  id: string;
  name: string;
  brand: string;
  images: string[];
  category: string;
  sizes: { lowestAsk: number | null; lastSalePrice: number | null }[];
}

interface Filters {
  query: string;
  category: string;
  brand: string;
  sizeFilter: string;
  minPrice: string;
  maxPrice: string;
}

interface ProductBrowseProps {
  initialProducts: Product[];
  totalPages: number;
  currentPage: number;
  brands: string[];
  sizes: string[];
  initialParams: Record<string, string | undefined>;
}

const SORT_OPTIONS = [
  { label: "Most Popular", value: "" },
  { label: "Price: Low-High", value: "price-asc" },
  { label: "Price: High-Low", value: "price-desc" },
  { label: "Recently Added", value: "newest" },
];

export function ProductBrowse({
  initialProducts,
  totalPages,
  currentPage,
  brands,
  sizes,
  initialParams,
}: ProductBrowseProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sort, setSort] = useState(initialParams.sort || "");

  const buildUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      return `/products?${params.toString()}`;
    },
    [searchParams]
  );

  const handleFiltersChange = useCallback(
    (filters: Filters) => {
      const url = buildUrl({
        query: filters.query,
        category: filters.category,
        brand: filters.brand,
        size: filters.sizeFilter,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        page: "1",
      });
      router.push(url);
    },
    [buildUrl, router]
  );

  const handleSortChange = useCallback(
    (newSort: string) => {
      setSort(newSort);
      router.push(buildUrl({ sort: newSort, page: "1" }));
    },
    [buildUrl, router]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      router.push(buildUrl({ page: page.toString() }));
    },
    [buildUrl, router]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <SearchBar
            initialFilters={{
              query: initialParams.query || "",
              category: initialParams.category || "",
              brand: initialParams.brand || "",
              sizeFilter: initialParams.size || "",
              minPrice: initialParams.minPrice || "",
              maxPrice: initialParams.maxPrice || "",
            }}
            brands={brands}
            sizes={sizes}
            onChange={handleFiltersChange}
          />
        </div>
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="input-field text-sm py-2 w-full sm:w-auto"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {initialProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No products found</p>
          <p className="text-gray-600 text-sm mt-2">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {initialProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
