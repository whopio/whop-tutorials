"use client";

import { WhopCheckoutEmbed } from "@whop/checkout/react";

/** Shared embedded-checkout panel (TIPS-7 / MEMBERSHIP-4). */
export function CheckoutEmbedPanel({
  sessionId,
  environment,
  onComplete,
}: {
  sessionId: string;
  environment: "sandbox" | "production";
  onComplete?: () => void;
}) {
  return (
    <div className="min-h-[420px]">
      <WhopCheckoutEmbed
        sessionId={sessionId}
        environment={environment}
        onComplete={() => onComplete?.()}
        themeOptions={{ accentColor: "blue" }}
      />
    </div>
  );
}
