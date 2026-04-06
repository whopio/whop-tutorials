# Shelfie — Part 2: Seller Onboarding

In this section, we're going to turn authenticated users into sellers. When someone clicks "Get Started," we create a connected account on Whop, verify their identity through KYC, and save a seller profile in the database. Whop handles identity verification, bank accounts, and tax documents — we don't build any of that.

---

## New Environment Variables

Seller onboarding needs three new variables:

<table>
<tr><th>Variable</th><th>Where to get it</th></tr>
<tr><td><code>WHOP_API_KEY</code></td><td>App API key (Developer > API Keys)</td></tr>
<tr><td><code>WHOP_COMPANY_ID</code></td><td>Your platform's company ID (from dashboard URL, starts with <code>biz_</code>)</td></tr>
<tr><td><code>WHOP_COMPANY_API_KEY</code></td><td>Company API key (Business Settings > API Keys)</td></tr>
</table>

`WHOP_API_KEY` needs these permission scopes: `company:create`, `company:basic:read`, `account_link:create`. In sandbox, the default key usually has all scopes enabled.

`WHOP_COMPANY_API_KEY` is a separate company-level key from Business Settings > API Keys (the same place you find your company ID). The app API key doesn't have the `access_pass:create` permission, so calls like `products.create()` and `checkoutConfigurations.create()` need this company key instead. We'll use it later via a `getCompanyWhop()` helper when we build product listings.

Add all three to Vercel, then `vercel env pull .env.local`.

## The Sell Page

We need a sell page that pitches users on becoming sellers. When the user clicks "Get Started," we POST to our onboard API, which either redirects to Whop's KYC flow (production) or skips it entirely (sandbox).

Go to `src/app/sell/` and create a file called `page.tsx` with the following content:

```tsx
"use client";

import { useState, Suspense } from "react";
import { ArrowRight, DollarSign, Shield, Zap, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SellPage() {
  return (
    <Suspense>
      <SellPageContent />
    </Suspense>
  );
}

function SellPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kycIncomplete = searchParams.get("kyc") === "incomplete";
  const [loading, setLoading] = useState(false);
  const [sandboxMessage, setSandboxMessage] = useState(false);

  async function handleOnboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/sell/onboard", { method: "POST" });
      const data = await res.json();

      if (data.sandbox) {
        setSandboxMessage(true);
        setTimeout(() => router.push("/sell/dashboard"), 2000);
        return;
      }

      if (data.redirect) {
        if (data.redirect.startsWith("http")) {
          window.location.href = data.redirect;
        } else {
          router.push(data.redirect);
        }
      }
    } catch (error) {
      console.error("Onboarding failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 className="text-4xl font-extrabold text-text-primary sm:text-5xl">
        Share your work with the world
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-lg text-text-secondary">
        Sell digital products on Shelfie. We handle payments, payouts, and
        compliance — you focus on creating.
      </p>

      {kycIncomplete && (
        <div className="mt-8 inline-flex items-center gap-2 bg-warning/10 px-6 py-3 text-sm font-medium text-warning">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
          Complete identity verification to start selling. Click below to continue.
        </div>
      )}

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        <div className="border border-border bg-surface p-6 text-center">
          <DollarSign className="mx-auto h-10 w-10 text-accent" />
          <h3 className="mt-4 text-base font-semibold text-text-primary">
            Set your own price
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Free or paid. You decide how much your work is worth.
          </p>
        </div>

        <div className="border border-border bg-surface p-6 text-center">
          <Shield className="mx-auto h-10 w-10 text-accent" />
          <h3 className="mt-4 text-base font-semibold text-text-primary">
            We handle payments
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Whop processes payments, handles compliance, and manages disputes.
          </p>
        </div>

        <div className="border border-border bg-surface p-6 text-center">
          <Zap className="mx-auto h-10 w-10 text-accent" />
          <h3 className="mt-4 text-base font-semibold text-text-primary">
            Keep 95% of every sale
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Just a 5% platform fee. Withdraw to your bank anytime.
          </p>
        </div>
      </div>

      {sandboxMessage && (
        <div className="mt-8 inline-flex items-center gap-2 bg-success/10 px-6 py-3 text-sm font-medium text-success">
          <CheckCircle className="h-5 w-5" aria-hidden="true" />
          This demo uses Whop Sandbox — KYC is not required. Redirecting to
          dashboard...
        </div>
      )}

      {!sandboxMessage && (
        <>
          <button
            onClick={handleOnboard}
            disabled={loading}
            className="mt-12 inline-flex items-center gap-2 bg-accent px-8 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? "Setting up..." : kycIncomplete ? "Complete Verification" : "Get Started"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="mt-4 text-xs text-text-secondary">
            {kycIncomplete
              ? "You\u2019ll be redirected to Whop to complete identity verification."
              : "You\u2019ll need to verify your identity to receive payouts. This is handled securely by Whop."}
          </p>
        </>
      )}
    </div>
  );
}
```

## The Onboard API Route

This route handles the entire onboarding flow — creating a connected account on Whop, generating a KYC link, and saving a `SellerProfile` in the database.

You'll notice `isSandbox` checks throughout the code. Whop's sandbox environment doesn't support the hosted KYC flow, so we skip it during development — the route sets `kycComplete: true` immediately and returns a sandbox flag instead of a KYC URL. **In production (when `WHOP_SANDBOX` is removed), these branches are never reached** — every seller goes through Whop's real identity verification before they can list products.

Go to `src/app/api/sell/onboard/` and create a file called `route.ts` with the following content:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";
import { generateUsername } from "@/lib/utils";
import { env } from "@/lib/env";

const isSandbox = process.env.WHOP_SANDBOX === "true";

export async function POST() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { sellerProfile: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Already a seller with completed KYC — go to dashboard
  if (user.sellerProfile?.kycComplete) {
    return NextResponse.json({ redirect: "/sell/dashboard" });
  }

  // Started onboarding but didn't finish KYC
  if (user.sellerProfile) {
    if (isSandbox) {
      await prisma.sellerProfile.update({
        where: { id: user.sellerProfile.id },
        data: { kycComplete: true },
      });
      return NextResponse.json({ sandbox: true });
    }

    const accountLink = await getWhop().accountLinks.create({
      company_id: user.sellerProfile.whopCompanyId,
      use_case: "account_onboarding",
      return_url: `${env.NEXT_PUBLIC_APP_URL}/sell/kyc-return`,
      refresh_url: `${env.NEXT_PUBLIC_APP_URL}/sell?refresh=true`,
    });

    return NextResponse.json({ redirect: accountLink.url });
  }

  // New seller — create connected account on Whop
  const company = await getWhop().companies.create({
    email: user.email,
    title: `${user.name || "Seller"}'s Store`,
    parent_company_id: env.WHOP_COMPANY_ID,
  });

  // Create SellerProfile with a unique username
  const username = generateUsername(user.name);

  if (isSandbox) {
    await prisma.sellerProfile.create({
      data: {
        userId: user.id,
        username,
        whopCompanyId: company.id,
        kycComplete: true,
      },
    });
    return NextResponse.json({ sandbox: true });
  }

  await prisma.sellerProfile.create({
    data: {
      userId: user.id,
      username,
      whopCompanyId: company.id,
      kycComplete: false,
    },
  });

  // Generate KYC onboarding link
  const accountLink = await getWhop().accountLinks.create({
    company_id: company.id,
    use_case: "account_onboarding",
    return_url: `${env.NEXT_PUBLIC_APP_URL}/sell/kyc-return`,
    refresh_url: `${env.NEXT_PUBLIC_APP_URL}/sell?refresh=true`,
  });

  return NextResponse.json({ redirect: accountLink.url });
}
```

## Username Generation

The `generateUsername()` function in `utils.ts` creates a URL-friendly username from the user's name:

```
"Alex Rivera"    → "alex-rivera-k7m2"
"Sarah Chen"     → "sarah-chen-p9x4"
null             → "seller-w3f1"
```

The random suffix guarantees uniqueness without a database check.

## Checkpoint

1. Sign in via Whop OAuth (set up earlier)
2. Navigate to `/sell`
3. Click "Get Started"
4. In sandbox: you'll see a success message and auto-redirect to the dashboard
5. In production: you'd be redirected to Whop's KYC page → complete verification → land on `/sell/kyc-return` → auto-redirect to dashboard
6. Check your database — you should see a `SellerProfile` row with `whopCompanyId` and `kycComplete = true`

## What's Next

With seller onboarding in place, the next part builds the product creation flow. Sellers will fill out a form with title, description, price, and category, upload files via UploadThing, and save the product as a draft.

Next up — **Part 3: Product Listings and File Uploads**.
