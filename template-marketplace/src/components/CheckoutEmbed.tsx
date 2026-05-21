"use client";

import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { useRouter } from "next/navigation";

interface CheckoutEmbedProps {
  /** Whop plan ID created by the publish route (one-time, hidden, has application_fee_amount). */
  planId: string;
  /** Used to build the return URL + the in-app navigation target on success. */
  slug: string;
  /** Server reads WHOP_SANDBOX and forwards a boolean — we don't want a NEXT_PUBLIC_ env var. */
  isSandbox: boolean;
  /** Same NEXT_PUBLIC_APP_URL the server already trimmed for OAuth — embed needs an absolute URL. */
  appUrl: string;
}

/**
 * Embedded Whop checkout. Buyer pays without leaving Stax.
 *
 * Two completion paths run in parallel:
 *  - Card payments: the embed fires `onComplete` in-frame, we client-route to /access.
 *  - External methods (Apple Pay, Google Pay, PayPal): Whop redirects the top frame to
 *    `returnUrl` (still our /access page). `returnUrl` is required when those methods
 *    are enabled — the embed itself can't catch their callbacks.
 *
 * The `payment.succeeded` webhook is the source of truth for creating the Purchase
 * row, so even if both paths race the access page only renders downloads once the
 * Purchase exists.
 */
export function CheckoutEmbed({ planId, slug, isSandbox, appUrl }: CheckoutEmbedProps) {
  const router = useRouter();
  const accessPath = `/templates/${slug}/access`;

  return (
    <WhopCheckoutEmbed
      planId={planId}
      environment={isSandbox ? "sandbox" : "production"}
      returnUrl={`${appUrl}${accessPath}`}
      onComplete={() => router.push(accessPath)}
      fallback={
        <div className="grid min-h-[420px] place-items-center text-sm text-[var(--color-text-secondary)]">
          Loading checkout…
        </div>
      }
    />
  );
}
