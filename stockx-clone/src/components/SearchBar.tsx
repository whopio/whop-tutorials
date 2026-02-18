"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CATEGORIES } from "@/constants";

interface Filters {
  query: string;
  category: string;
  brand: string;
  sizeFilter: string;
  minPrice: string;
  maxPrice: string;
}

interface SearchBarProps {
  initialFilters?: Partial<Filters>;
  brands?: string[];
  sizes?: string[];
  onChange: (filters: Filters) => void;
}

const DEFAULT_FILTERS: Filters = {
  query: "",
  category: "",
  brand: "",
  sizeFilter: "",
  minPrice: "",
  maxPrice: "",
};

export function SearchBar({
  initialFilters,
  brands = [],
  sizes = [],
  onChange,
}: SearchBarProps) {
  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isFirstRender = useRef(true);

  const emitChange = useCallback(
    (newFilters: Filters) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(newFilters);
      }, 300);
    },
    [onChange]
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    emitChange(filters);
  }, [filters, emitChange]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilter = (key: keyof Filters) => {
    setFilters((prev) => ({ ...prev, [key]: "" }));
  };

  const activeFilters = Object.entries(filters).filter(
    ([key, value]) => key !== "query" && value !== ""
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={filters.query}
          onChange={(e) => updateFilter("query", e.target.value)}
          placeholder="Search products..."
          className="input-field w-full pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filters.category}
          onChange={(e) => updateFilter("category", e.target.value)}
          className="input-field text-sm py-2"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {brands.length > 0 && (
          <select
            value={filters.brand}
            onChange={(e) => updateFilter("brand", e.target.value)}
            className="input-field text-sm py-2"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}

        {sizes.length > 0 && (
          <select
            value={filters.sizeFilter}
            onChange={(e) => updateFilter("sizeFilter", e.target.value)}
            className="input-field text-sm py-2"
          >
            <option value="">All Sizes</option>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1">
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => updateFilter("minPrice", e.target.value)}
            placeholder="Min $"
            className="input-field text-sm py-2 w-24"
          />
          <span className="text-gray-600">-</span>
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => updateFilter("maxPrice", e.target.value)}
            placeholder="Max $"
            className="input-field text-sm py-2 w-24"
          />
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full"
            >
              <span className="text-gray-500 capitalize">
                {key === "sizeFilter" ? "size" : key === "minPrice" ? "min" : key === "maxPrice" ? "max" : key}:
              </span>
              {key === "minPrice" || key === "maxPrice" ? `$${value}` : value}
              <button
                onClick={() => clearFilter(key as keyof Filters)}
                className="ml-1 text-gray-500 hover:text-gray-300"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
