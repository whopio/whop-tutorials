"use client";

import { useState, type FormEvent } from "react";
import { DemoModal } from "@/components/DemoModal";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

interface SizeOption {
  id: string;
  size: string;
  highestBid: number | null;
  lowestAsk: number | null;
}

interface BidFormProps {
  productSizes: SizeOption[];
  selectedSize: string | null;
  onSizeChange: (sizeId: string) => void;
  onBidPlaced?: () => void;
}

const EXPIRY_OPTIONS = [
  { label: "1 Day", days: 1 },
  { label: "7 Days", days: 7 },
  { label: "14 Days", days: 14 },
  { label: "30 Days", days: 30 },
];

export function BidForm({
  productSizes,
  selectedSize,
  onSizeChange,
  onBidPlaced,
}: BidFormProps) {
  const [price, setPrice] = useState("");
  const [expiryDays, setExpiryDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);

  const selected = productSizes.find((s) => s.id === selectedSize);
  const highestBid = selected?.highestBid;
  const lowestAsk = selected?.lowestAsk;

  const redirectToCheckout = async (tradeId: string) => {
    try {
      const checkoutRes = await fetch(`/api/trades/${tradeId}/checkout`, {
        method: "POST",
      });

      if (!checkoutRes.ok) {
        const errData = await checkoutRes.json();
        throw new Error(errData.error || "Failed to create checkout");
      }

      const { checkoutUrl } = await checkoutRes.json();
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to redirect to checkout"
      );
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSize || !price) return;
    if (IS_DEMO) { setDemoOpen(true); return; }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSizeId: selectedSize,
          price: parseFloat(price),
          expiresAt: new Date(
            Date.now() + expiryDays * 24 * 60 * 60 * 1000
          ).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to place bid");
      }

      const data = await res.json();

      if (data.matched && data.trade?.id) {
        await redirectToCheckout(data.trade.id);
        return;
      }

      setPrice("");
      onBidPlaced?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bid");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNow = async () => {
    if (!selectedSize || !lowestAsk) return;
    if (IS_DEMO) { setDemoOpen(true); return; }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSizeId: selectedSize,
          price: lowestAsk,
          expiresAt: new Date(
            Date.now() + 1 * 24 * 60 * 60 * 1000
          ).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to place bid");
      }

      const data = await res.json();

      if (data.matched && data.trade?.id) {
        await redirectToCheckout(data.trade.id);
        return;
      }

      onBidPlaced?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to buy now");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Size
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {productSizes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSizeChange(s.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                selectedSize === s.id
                  ? "border-brand-600 bg-brand-600/20 text-brand-400"
                  : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
              }`}
            >
              {s.size}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <>
          {highestBid != null && (
            <p className="text-sm text-gray-400">
              Current Highest Bid:{" "}
              <span className="text-brand-400 font-medium">
                ${highestBid.toLocaleString()}
              </span>
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Bid Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                $
              </span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter bid amount"
                min="1"
                step="1"
                className="input-field w-full pl-8"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bid Expiration
            </label>
            <select
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
              className="input-field w-full"
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.days} value={opt.days}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isSubmitting || !price}
              className="btn-primary w-full"
            >
              {isSubmitting ? "Placing Bid..." : "Place Bid"}
            </button>

            {lowestAsk != null && (
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isSubmitting}
                className="btn-secondary w-full"
              >
                Buy Now at ${lowestAsk.toLocaleString()}
              </button>
            )}
          </div>
        </>
      )}
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </form>
  );
}
