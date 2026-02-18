"use client";

import { useEffect, useState } from "react";

interface BidItem {
  id: string;
  price: number;
  status: string;
  createdAt: string;
  productSize: {
    size: string;
    product: { name: string; brand: string; images: string[] };
  };
}

interface AskItem {
  id: string;
  price: number;
  status: string;
  createdAt: string;
  productSize: {
    size: string;
    product: { name: string; brand: string; images: string[] };
  };
}

interface TradeItem {
  id: string;
  price: number;
  platformFee: number;
  status: string;
  createdAt: string;
  productSize: {
    size: string;
    lastSalePrice: number | null;
    product: { name: string; brand: string; images: string[] };
  };
}

interface PortfolioData {
  activeBids: BidItem[];
  activeAsks: AskItem[];
  completedTrades: TradeItem[];
  totalSpent: number;
  totalEarned: number;
  portfolioValue: number;
}

interface UsePortfolioReturn extends PortfolioData {
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePortfolio(enabled = true): UsePortfolioReturn {
  const [data, setData] = useState<PortfolioData>({
    activeBids: [],
    activeAsks: [],
    completedTrades: [],
    totalSpent: 0,
    totalEarned: 0,
    portfolioValue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/portfolio");
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const raw = await res.json();
      // Normalize: API returns { count, items } objects, hook exposes flat arrays
      const portfolio: PortfolioData = {
        activeBids: raw.activeBids?.items ?? raw.activeBids ?? [],
        activeAsks: raw.activeAsks?.items ?? raw.activeAsks ?? [],
        completedTrades: raw.completedTrades?.items ?? raw.completedTrades ?? [],
        totalSpent: raw.totalSpent ?? 0,
        totalEarned: raw.totalEarned ?? 0,
        portfolioValue: raw.portfolioValue ?? 0,
      };
      setData(portfolio);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch portfolio"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchPortfolio();
    } else {
      setIsLoading(false);
    }
  }, [enabled]);

  return { ...data, isLoading, error, refetch: fetchPortfolio };
}
