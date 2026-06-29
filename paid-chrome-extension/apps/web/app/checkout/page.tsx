import Link from "next/link";
import { CheckoutEmbed } from "@/components/CheckoutEmbed";
import { getCheckoutUrl, getServerEnv } from "@/lib/env";

export default function CheckoutPage() {
  const env = getServerEnv();

  return (
    <main className="checkout-page">
      <section className="checkout-copy">
        <p className="eyebrow">Whop checkout</p>
        <h1>Unlock extension access</h1>
        <p className="lead">
          After purchase, users sign in with Whop inside the extension.
          Webhooks can update your own database if you add persistent accounts.
        </p>
        <ul className="clean-list">
          <li>Customer login through Whop OAuth</li>
          <li>Server-side gating through Whop check-access</li>
          <li>Billing management through Whop memberships</li>
        </ul>
      </section>

      <section className="checkout-box">
        {env.whopPlanId ? (
          <>
            <CheckoutEmbed planId={env.whopPlanId} />
            <a className="fallback-link" href={getCheckoutUrl()}>
              Open hosted checkout instead
            </a>
          </>
        ) : (
          <div className="setup-callout">
            <h2>Plan id not configured</h2>
            <p>
              Set <code>WHOP_PLAN_ID</code> in <code>apps/web/.env.local</code>
              to render the Whop checkout embed.
            </p>
            <Link className="button secondary" href="/docs">
              Read setup docs
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
