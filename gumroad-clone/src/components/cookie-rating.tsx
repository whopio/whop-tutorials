// src/components/cookie-rating.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Full cookie — round with chocolate chips
function CookieFull({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <circle cx="8" cy="8" r="1.5" fill="var(--color-surface)" />
      <circle cx="14" cy="7" r="1.2" fill="var(--color-surface)" />
      <circle cx="10" cy="13" r="1.3" fill="var(--color-surface)" />
      <circle cx="15" cy="14" r="1.5" fill="var(--color-surface)" />
      <circle cx="7" cy="15" r="1" fill="var(--color-surface)" />
      <circle cx="16" cy="10" r="1" fill="var(--color-surface)" />
    </svg>
  );
}

// Half-eaten cookie — large bite from right side, clearly visible at small sizes
function CookieHalf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      {/* Cookie body: full circle minus a big scalloped bite from the right.
          The bite is a concave arc (radius 7) carved into the right side
          between roughly 4 o'clock and 1 o'clock. */}
      <path
        d="M12 2 A10 10 0 1 0 19 18 A7 7 0 0 1 19 6 A10 10 0 0 0 12 2z"
        fill="currentColor"
      />
      {/* Chocolate chips */}
      <circle cx="6.5" cy="9" r="1.5" fill="var(--color-surface)" />
      <circle cx="10" cy="15" r="1.4" fill="var(--color-surface)" />
      <circle cx="5" cy="14.5" r="1" fill="var(--color-surface)" />
      {/* Crumbs */}
      <circle cx="21" cy="9" r="0.8" fill="currentColor" />
      <circle cx="22" cy="13" r="0.6" fill="currentColor" />
      <circle cx="20" cy="16" r="0.5" fill="currentColor" />
    </svg>
  );
}

// Empty cookie — just outline
function CookieEmpty({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="14" cy="7" r="1.2" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="10" cy="13" r="1.3" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="15" cy="14" r="1.5" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="7" cy="15" r="1" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

interface CookieRatingProps {
  productId: string;
  initialRating: number | null;
  averageRating: number;
  ratingCount: number;
  canRate: boolean;
}

export function CookieRating({
  productId,
  initialRating,
  averageRating,
  ratingCount,
  canRate,
}: CookieRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleRate(cookies: number) {
    if (!canRate || saving) return;
    setSaving(true);
    setRating(cookies);

    try {
      const res = await fetch(`/api/products/${productId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookies }),
      });
      if (!res.ok) setRating(initialRating);
    } catch {
      setRating(initialRating);
    } finally {
      setSaving(false);
    }
  }

  function renderCookie(position: number, value: number) {
    const full = position;
    const half = position - 0.5;

    if (value >= full) {
      return <CookieFull className="h-full w-full" />;
    } else if (value >= half) {
      return <CookieHalf className="h-full w-full" />;
    }
    return <CookieEmpty className="h-full w-full" />;
  }

  // Display-only mode
  if (!canRate) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((pos) => (
            <div
              key={pos}
              className={cn(
                "h-6 w-6",
                Math.round(averageRating * 2) / 2 >= pos - 0.5
                  ? "text-warning"
                  : "text-border"
              )}
            >
              {renderCookie(pos, Math.round(averageRating * 2) / 2)}
            </div>
          ))}
        </div>
        <span className="text-xs text-text-secondary">
          {averageRating > 0 ? averageRating.toFixed(1) : "No ratings"}{" "}
          {ratingCount > 0 && `(${ratingCount})`}
        </span>
      </div>
    );
  }

  // Interactive mode
  const display = hover ?? rating ?? 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((pos) => (
          <div key={pos} className="relative h-7 w-7">
            {/* Left half — clicks to pos - 0.5 */}
            <button
              type="button"
              disabled={saving}
              onClick={() => handleRate(pos - 0.5)}
              onMouseEnter={() => setHover(pos - 0.5)}
              onMouseLeave={() => setHover(null)}
              aria-label={`Rate ${pos - 0.5} cookies`}
              className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer"
            />
            {/* Right half — clicks to pos */}
            <button
              type="button"
              disabled={saving}
              onClick={() => handleRate(pos)}
              onMouseEnter={() => setHover(pos)}
              onMouseLeave={() => setHover(null)}
              aria-label={`Rate ${pos} cookies`}
              className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer"
            />
            {/* Visual */}
            <div
              className={cn(
                "h-full w-full pointer-events-none transition-colors",
                display >= pos - 0.5 ? "text-warning" : "text-border"
              )}
            >
              {renderCookie(pos, display)}
            </div>
          </div>
        ))}
      </div>
      <span className="text-xs text-text-secondary">
        {rating
          ? `${rating} cookie${rating !== 1 ? "s" : ""}`
          : "Rate this product"}
      </span>
    </div>
  );
}

// Compact display for product cards
export function CookieDisplay({
  average,
  count,
}: {
  average: number;
  count: number;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1">
      <CookieFull className="h-3.5 w-3.5 text-warning" />
      <span className="text-xs text-text-secondary">
        {average.toFixed(1)}
      </span>
    </div>
  );
}
