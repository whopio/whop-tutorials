"use client";

import { WhopCheckoutEmbed } from "@whop/checkout/react";

interface WhopCheckoutProps {
  sessionId: string;
  returnUrl: string;
  sandbox: boolean;
}

export function WhopCheckout({
  sessionId,
  returnUrl,
  sandbox,
}: WhopCheckoutProps) {
  return (
    <div className="bg-[color:var(--color-surface)] rounded-[var(--radius-lg)] border border-[color:var(--color-border)] shadow-[var(--shadow-card)] animate-fade">
      <WhopCheckoutEmbed
        sessionId={sessionId}
        returnUrl={returnUrl}
        environment={sandbox ? "sandbox" : "production"}
        theme="light"
        themeOptions={{ accentColor: "tomato" }}
        fallback={<CheckoutSkeleton />}
      />
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="h-[560px] w-full bg-[color:var(--color-surface-alt)] animate-pulse-soft rounded-[var(--radius-lg)]" />
  );
}
