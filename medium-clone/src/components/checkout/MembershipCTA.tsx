"use client";

import { useState } from "react";
import { PlusCheckoutPopup } from "./PlusCheckoutPopup";

interface Props {
  authenticated: boolean;
  label?: string;
  className?: string;
  promoCode?: string;
}

/**
 * Click → opens the embedded Plus checkout popup. Used on /membership, the paywall card,
 * and anywhere else that needs to start a Plus subscription without a page navigation.
 */
export function MembershipCTA({
  authenticated,
  label = "Get started",
  className,
  promoCode,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!authenticated) {
            window.location.href = "/api/auth/login?returnTo=/membership";
            return;
          }
          setOpen(true);
        }}
        className={
          className ??
          "inline-flex items-center px-6 py-3 rounded-pill bg-brand text-white text-base font-medium hover:bg-brand-hover"
        }
      >
        {label}
      </button>
      <PlusCheckoutPopup
        open={open}
        onClose={() => setOpen(false)}
        promoCode={promoCode}
      />
    </>
  );
}
