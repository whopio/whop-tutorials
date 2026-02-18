"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/services/supabase";

interface Bid {
  id: string;
  userId: string;
  productSizeId: string;
  price: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

interface Ask {
  id: string;
  userId: string;
  productSizeId: string;
  price: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

interface UseRealtimeBidsReturn {
  bids: Bid[];
  asks: Ask[];
  isLoading: boolean;
  error: string | null;
}

export function useRealtimeBids(productSizeId: string): UseRealtimeBidsReturn {
  const [bids, setBids] = useState<Bid[]>([]);
  const [asks, setAsks] = useState<Ask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBids = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/bids?productSizeId=${encodeURIComponent(productSizeId)}`
      );
      if (!res.ok) throw new Error("Failed to fetch bids");
      const data = await res.json();
      setBids(
        (data.bids ?? data ?? []).sort(
          (a: Bid, b: Bid) => b.price - a.price
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bids");
    }
  }, [productSizeId]);

  const fetchAsks = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/asks?productSizeId=${encodeURIComponent(productSizeId)}`
      );
      if (!res.ok) throw new Error("Failed to fetch asks");
      const data = await res.json();
      setAsks(
        (data.asks ?? data ?? []).sort(
          (a: Ask, b: Ask) => a.price - b.price
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch asks");
    }
  }, [productSizeId]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    Promise.all([fetchBids(), fetchAsks()]).finally(() => setIsLoading(false));

    const supabase = createBrowserClient();

    const channel = supabase
      .channel(`orderbook-${productSizeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Bid",
          filter: `productSizeId=eq.${productSizeId}`,
        },
        () => {
          fetchBids();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Ask",
          filter: `productSizeId=eq.${productSizeId}`,
        },
        () => {
          fetchAsks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productSizeId, fetchBids, fetchAsks]);

  return { bids, asks, isLoading, error };
}
