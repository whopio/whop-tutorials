"use client";

import { useState } from "react";
import { MembershipCTA } from "./MembershipCTA";

interface Props {
  authenticated: boolean;
}

export function MembershipPromoSection({ authenticated }: Props) {
  const [showInput, setShowInput] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  return (
    <>
      <MembershipCTA
        authenticated={authenticated}
        label="Get started"
        promoCode={promoCode || undefined}
        className="inline-flex items-center justify-center w-full px-5 py-3 rounded-pill bg-brand text-white text-sm font-medium hover:bg-brand-hover"
      />
      <div className="mt-3 text-center">
        {showInput ? (
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="Promo code"
            aria-label="Promo code"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-primary text-center uppercase tracking-wider font-mono"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            Have a promo code?
          </button>
        )}
      </div>
    </>
  );
}
