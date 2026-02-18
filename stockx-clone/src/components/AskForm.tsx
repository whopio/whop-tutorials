"use client";

import { useState, type FormEvent } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { DemoModal } from "@/components/DemoModal";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

interface SizeOption {
  id: string;
  size: string;
  highestBid: number | null;
  lowestAsk: number | null;
}

interface AskFormProps {
  productSizes: SizeOption[];
  selectedSize: string | null;
  onSizeChange: (sizeId: string) => void;
  onAskPlaced?: () => void;
}

const EXPIRY_OPTIONS = [
  { label: "1 Day", days: 1 },
  { label: "7 Days", days: 7 },
  { label: "14 Days", days: 14 },
  { label: "30 Days", days: 30 },
];

export function AskForm({
  productSizes,
  selectedSize,
  onSizeChange,
  onAskPlaced,
}: AskFormProps) {
  const { user, isLoading: authLoading } = useCurrentUser();
  const [price, setPrice] = useState("");
  const [expiryDays, setExpiryDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);

  const selected = productSizes.find((s) => s.id === selectedSize);
  const highestBid = selected?.highestBid;
  const lowestAsk = selected?.lowestAsk;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSize || !price) return;
    if (IS_DEMO) { setDemoOpen(true); return; }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/asks", {
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
        throw new Error(data.error || "Failed to place ask");
      }

      setPrice("");
      onAskPlaced?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place ask");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSellNow = async () => {
    if (!selectedSize || !highestBid) return;
    if (IS_DEMO) { setDemoOpen(true); return; }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/asks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSizeId: selectedSize,
          price: highestBid,
          expiresAt: new Date(
            Date.now() + 1 * 24 * 60 * 60 * 1000
          ).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to place ask");
      }

      onAskPlaced?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sell now");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOnboard = async () => {
    if (IS_DEMO) { setDemoOpen(true); return; }
    setIsOnboarding(true);
    setError(null);
    try {
      const res = await fetch("/api/sellers/onboard", { method: "POST" });
      const data = await res.json();
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        setError(data.error || "Failed to start onboarding");
      }
    } catch {
      setError("Failed to start onboarding");
    } finally {
      setIsOnboarding(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-gray-400">Sign in to start selling</p>
        <a
          href="/api/auth/login"
          className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  if (!user.connectedAccountId) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-gray-400">
          To sell on this marketplace, you need to complete seller verification
          through Whop.
        </p>
        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <button
          onClick={handleOnboard}
          disabled={isOnboarding}
          className="inline-block bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {isOnboarding ? "Setting up..." : "Become a Seller"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
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
                  ? "border-red-500 bg-red-500/20 text-red-400"
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
          {lowestAsk != null && (
            <p className="text-sm text-gray-400">
              Current Lowest Ask:{" "}
              <span className="text-red-400 font-medium">
                ${lowestAsk.toLocaleString()}
              </span>
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Ask Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                $
              </span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter ask amount"
                min="1"
                step="1"
                className="input-field w-full pl-8"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ask Expiration
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
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Placing Ask..." : "Place Ask"}
            </button>

            {highestBid != null && (
              <button
                type="button"
                onClick={handleSellNow}
                disabled={isSubmitting}
                className="btn-secondary w-full"
              >
                Sell Now at ${highestBid.toLocaleString()}
              </button>
            )}
          </div>
        </>
      )}
    </form>
  );
}
