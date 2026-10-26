"use client";

import { useRouter } from "next/navigation";
import { WhopElements, Checkout, CheckoutElement } from "@whop/elements-react";
import { loadWhop } from "@whop/elements";
import { ELEMENTS_APPEARANCE } from "@/components/elements";
import { ElementLoading } from "@/components/ElementLoading";

// The checkout configuration names the plan and the redirect back to this
// app, so the page passes only its id. The signed-in user's Whop email is
// prefilled and locked, which puts the membership on the same Whop user the
// app knows from sign-in.
export function MembershipCheckout({
  checkoutId,
  buyerEmail,
  returnUrl,
  sandbox,
  onPaid,
}: {
  checkoutId: string;
  buyerEmail: string;
  returnUrl: string;
  sandbox: boolean;
  onPaid?: () => void;
}) {
  const router = useRouter();

  return (
    <WhopElements elements={loadWhop()} environment={sandbox ? "sandbox" : "production"} appearance={ELEMENTS_APPEARANCE}>
      <Checkout
        checkoutConfiguration={checkoutId}
        returnUrl={returnUrl}
        fallback={<ElementLoading label="Loading secure checkout..." />}
        onComplete={(done) => {
          // Whop then sends the tab to the configuration's redirect_url with
          // ?payment_id=…&status=success. This only gets there sooner.
          if (done.result !== "payment") return;
          onPaid?.();
          const url = new URL(returnUrl);
          url.searchParams.set("payment", done.paymentId);
          url.searchParams.set("status", "succeeded");
          router.push(`${url.pathname}${url.search}`, { scroll: false });
        }}
      >
        <CheckoutElement buyerEmail={buyerEmail} lockBuyerEmail />
      </Checkout>
    </WhopElements>
  );
}
