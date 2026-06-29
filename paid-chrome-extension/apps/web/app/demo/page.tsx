import Link from "next/link";
import { getServerEnv } from "@/lib/env";

export default function DemoPage() {
  const env = getServerEnv();

  return (
    <main className="narrow-page">
      <p className="eyebrow">Template status</p>
      <h1>What the installed extension includes</h1>
      <p className="lead">
        The popup signs in with Whop, checks this API for the current user&apos;s
        entitlement, opens Whop checkout, links to billing, and only unlocks the
        gated feature when Whop access is active.
      </p>

      <div className="status-panel">
        <div>
          <span>API mode</span>
          <strong>{env.mockMode ? "Mock mode" : "Whop production mode"}</strong>
        </div>
        <div>
          <span>Access resource</span>
          <strong>{env.whopResourceId || "Not configured"}</strong>
        </div>
        <div>
          <span>Checkout plan</span>
          <strong>{env.whopPlanId || "Not configured"}</strong>
        </div>
      </div>

      <section className="plain-section">
        <h2>Request flow</h2>
        <ol className="steps">
          <li>Open the extension popup and sign in with Whop or mock premium.</li>
          <li>The background service worker refreshes a Whop OAuth token.</li>
          <li>The extension calls this app&apos;s entitlement endpoint.</li>
          <li>The gated endpoint rechecks access before returning paid output.</li>
          <li>The billing button asks this API for a Whop membership manage URL.</li>
        </ol>
      </section>

      <Link className="button primary" href="/checkout?source=demo">
        View checkout page
      </Link>
    </main>
  );
}
