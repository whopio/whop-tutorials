# How to build a Medium clone with Next.js and Whop — Payments + Launch (2/2)

The second half of the Storyline guide. File 1 (`medium-clone-1.md`) covered foundation through editor; this file covers everything money-flow-adjacent plus shipping: the Plus subscription, the unified webhook handler, writer sub-company onboarding + the embedded payout portal, tipping (writer-routed checkout with platform `application_fee_amount`), the monthly Partner Program payout cron with `whop.transfers.create`, then discovery/engagement, the operator allowlist + promo codes, the sandbox→prod switch, and a **consolidated 26-item gotchas list** at the end.

- Demo: [storyline-three-orpin.vercel.app](https://storyline-three-orpin.vercel.app)
- Code: [github.com/whopio/whop-tutorials/tree/main/medium-clone](https://github.com/whopio/whop-tutorials/tree/main/medium-clone)

**Prerequisites from file 1:**

- `getCompanyWhop()` and `getWhop()` from `src/lib/whop.ts`
- `requireAuth()` from `src/lib/auth.ts`
- `env` from `src/lib/env.ts` (especially `WHOP_COMPANY_ID`, `STORYLINE_PLUS_PLAN_ID`, `WHOP_WEBHOOK_SECRET`, `TIP_PLATFORM_FEE_PERCENT`, `PLATFORM_PLUS_FEE_PERCENT`, `STORYLINE_PLUS_MONTHLY_PRICE`, `PARTNER_PAYOUT_MIN_USD`, `CRON_SECRET`)
- The `PlusMembership`, `Tip`, `StoryRead`, `PartnerPayout`, `WebhookEvent`, `Notification`, `WriterProfile` models from the schema
- `vercel.ts` (the cron declaration lives there; full route handler is in this file)
- The paywall truncation logic + `<StoryContent>` server-render component (used here to gate Plus content)
- The `StoryCard` component (reused across discovery surfaces)

---

## Plus subscription ($5/month)

### Plan setup

Storyline Plus is **one** recurring `renewal` plan on the platform's own company (not a sub-company — sub-companies are for writer tips). Created once with a bootstrap script (`scripts/create-plus-plan.ts`) that calls `whop.products.create` then `whop.plans.create` against `WHOP_COMPANY_ID` and prints `STORYLINE_PLUS_PLAN_ID=plan_xxxx`. Paste into Vercel, `vercel env pull`.

> `products.create` and `plans.create` require the **company** API key, not the app key — the script uses `getCompanyWhop()`. `initial_price` / `renewal_price` are **dollars as numbers**, not cents.

Register one webhook endpoint at `${APP_URL}/api/webhooks/whop` listening for `payment_succeeded`, `payment_failed`, `membership_activated`, `membership_deactivated`, `refund_created`. The signing secret goes into `WHOP_WEBHOOK_SECRET`.

The pricing page at `/membership` is a static marketing page (hero, benefits, pricing card) that mounts `<MembershipCTA>`. The CTA button either redirects to `/api/auth/login?returnTo=/membership` if signed out, or opens `<PlusCheckoutPopup>` if signed in.

### `src/app/api/membership/checkout/route.ts`

Each subscribe click mints a fresh checkout configuration referencing the existing plan. Metadata distinguishes Plus from tips later.

```ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getCompanyWhop } from "@/lib/whop";
import { env } from "@/lib/env";

const Schema = z.object({
  promoCode: z.string().trim().min(1).max(64).optional(),
});

function checkoutEnvironment() {
  return process.env.WHOP_SANDBOX === "true" ? "sandbox" : "production";
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const returnUrl = `${env.NEXT_PUBLIC_APP_URL}/me/membership`;
    const checkout = await getCompanyWhop().checkoutConfigurations.create({
      plan_id: env.STORYLINE_PLUS_PLAN_ID,
      ...(returnUrl.startsWith("https://") ? { redirect_url: returnUrl } : {}),
      source_url: `${env.NEXT_PUBLIC_APP_URL}/membership`,
      ...(parsed.data.promoCode ? { promo_code: parsed.data.promoCode } : {}),
      metadata: {
        kind: "plus",
        userId: user.id,
        ...(parsed.data.promoCode ? { promoCode: parsed.data.promoCode } : {}),
      },
    });
    return NextResponse.json({
      sessionId: checkout.id,
      planId: checkout.plan?.id ?? env.STORYLINE_PLUS_PLAN_ID,
      environment: checkoutEnvironment(),
      returnUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

> `redirect_url` is only added when the URL is `https://` (Whop rejects `http://localhost`). The `kind: "plus"` metadata is how the webhook tells Plus payments apart from tips — the same webhook handler covers both.

### Embedded checkout (`<WhopCheckoutEmbed>`)

The popup mounts a fresh inner component on each open so a stale `sessionId` never lingers after a successful payment. The same `@whop/checkout/react` component runs both Plus and tip checkouts.

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { CheckoutPopup } from "./CheckoutPopup";

interface CheckoutSession {
  sessionId: string;
  planId: string;
  environment: "sandbox" | "production";
  returnUrl: string;
}

function PlusCheckoutInner({ onClose, promoCode }: { onClose: () => void; promoCode?: string }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [checkout, setCheckout] = useState<CheckoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/membership/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promoCode }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok || !data.sessionId) {
          setError(data.error || "Could not start checkout.");
          return;
        }
        setCheckout(data);
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Could not start checkout."));
    return () => { cancelled = true; };
  }, [promoCode]);

  return (
    <CheckoutPopup title="Subscribe to Storyline" onClose={onClose}>
      {error ? (
        <div role="alert" className="p-6 text-sm text-error">{error}</div>
      ) : checkout ? (
        <WhopCheckoutEmbed
          planId={checkout.planId}
          sessionId={checkout.sessionId}
          returnUrl={checkout.returnUrl}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          themeOptions={{ accentColor: "green" }}
          environment={checkout.environment}
          styles={{ container: { paddingX: 16, paddingY: 8 } }}
          fallback={<div className="p-12 text-center">Loading checkout…</div>}
          onComplete={() => {
            onClose();
            router.refresh();
          }}
        />
      ) : (
        <div className="p-12 text-center">Preparing checkout…</div>
      )}
    </CheckoutPopup>
  );
}

export function PlusCheckoutPopup({ open, onClose, promoCode }: {
  open: boolean; onClose: () => void; promoCode?: string;
}) {
  if (!open) return null;
  return <PlusCheckoutInner onClose={onClose} promoCode={promoCode} />;
}
```

> `onComplete` closes the popup and calls `router.refresh()`. Truth lives in the webhook — the refresh just re-fetches the now-`ACTIVE` membership row. The `environment` prop must match the sandbox/prod environment used to mint the session, or the embed silently 404s.

### Self-service: pause / resume / cancel / uncancel

Four routes, each the same shape: `requireAuth` with `plusMembership` included, call the matching Whop SDK method, mirror the state to the local `PlusMembership` row. The webhook will also fire and update the same row — both writes are convergent.

```ts
// src/app/api/membership/cancel/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";

export async function POST() {
  const user = await requireAuth({ include: { plusMembership: true } });
  const membership = user.plusMembership;
  if (!membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 400 });
  }
  await getCompanyWhop().memberships.cancel(membership.whopMembershipId, {
    cancellation_mode: "at_period_end",
  });
  await prisma.plusMembership.update({
    where: { id: membership.id },
    data: { cancelAtPeriodEnd: true },
  });
  return NextResponse.json({ ok: true });
}
```

The other three are byte-identical except for the SDK method and DB write:

- `/api/membership/uncancel` → `memberships.uncancel(id)`; set `cancelAtPeriodEnd: false`.
- `/api/membership/pause` → `memberships.pause(id)`; set `status: "PAUSED"`.
- `/api/membership/resume` → `memberships.resume(id)`; set `status: "ACTIVE"`.

The `/me/membership` page renders `<MembershipActions>` (client) which swaps button sets by state machine:

- `ACTIVE && !cancelAtPeriodEnd` → **Pause** + **Cancel** (each with a two-click confirm)
- `ACTIVE && cancelAtPeriodEnd` → **Uncancel**
- `PAUSED` → **Resume**
- `EXPIRED` or missing → upsell CTA back to `/membership`

`useTransition` keeps the buttons disabled while the POST is in flight, then `router.refresh()` re-renders the page from the freshly updated DB row.

### `src/components/PaywallCard.tsx`

Truncation happens server-side in `StoryContent` (file 1). This component is the upsell card shown beneath the preview when `story.visibility === "PLUS" && !isPlus`.

```tsx
import { Star } from "lucide-react";
import { MembershipCTA } from "@/components/checkout/MembershipCTA";

export function PaywallCard({
  authenticated,
  writerName,
  returnTo,
}: {
  authenticated: boolean;
  writerName: string;
  returnTo?: string;
}) {
  const loginHref = `/api/auth/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  return (
    <aside aria-label="Plus paywall" className="not-prose mt-10 pt-10 border-t border-border text-center font-sans">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-plus/15 border border-plus/30 text-[12px]">
        <Star aria-hidden="true" className="size-3.5 fill-plus stroke-plus" />
        <span className="font-medium text-text-primary">Paid story</span>
      </div>
      <h2 className="mt-5 text-[18px] font-medium text-text-primary">
        The rest of this story is behind the paywall.
      </h2>
      <p className="mt-2 mx-auto max-w-md text-sm text-text-secondary">
        $5/month unlocks every paid story on Storyline, including this one, and a share goes
        directly to {writerName} based on what you read.
      </p>
      <div className="mt-6 mx-auto max-w-[320px] flex flex-col gap-2">
        <MembershipCTA authenticated={authenticated} label="Subscribe — $5/month" />
        {!authenticated && (
          <a href={loginHref} className="...">
            Already subscribed? Sign in
          </a>
        )}
      </div>
    </aside>
  );
}
```

The story page decides `locked = story.visibility === "PLUS" && !isPlus` server-side, then either passes `truncateAtPaywall: true` to `StoryContent` and renders `<PaywallCard>` below, or renders the full body. **The locked content never leaves the server.**

---

## Webhooks

### `src/app/api/webhooks/whop/route.ts`

One endpoint handles every event Whop sends. Signature verified via `whop.webhooks.unwrap`, dedupe by event ID in `WebhookEvent` (unique constraint on `id`), heavy work pushed into `waitUntil` so Whop's retry timer doesn't fire while we work. The `payment.succeeded` handler is a multiplexer that branches on `metadata.kind` (`"plus"` here, `"tip"` from the tipping section below).

```ts
import { waitUntil } from "@vercel/functions";
import type { NextRequest } from "next/server";
import { getWhop } from "@/lib/whop";
import { prisma } from "@/lib/prisma";

interface WebhookData { id: string; type: string; data: Record<string, unknown>; }

interface MembershipPayload {
  id?: string;
  user?: { id?: string; email?: string };
  plan?: { id?: string };
  expires_at?: string | number;
  expiration_at?: string | number;
  current_period_end?: string | number;
  status?: string;
  metadata?: Record<string, unknown>;
}

interface PaymentPayload {
  id?: string;
  membership?: { id?: string };
  membership_id?: string;
  user?: { id?: string; email?: string };
  plan?: { id?: string };
  subtotal?: number;
  metadata?: Record<string, unknown>;
}

interface RefundPayload { id?: string; payment?: { id?: string }; }

function toDate(value: string | number | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function findUserByWhopId(whopUserId: string) {
  return prisma.user.findUnique({ where: { whopUserId } });
}

async function handleMembershipActivated(data: MembershipPayload) {
  const whopMembershipId = data.id;
  const whopUserId = data.user?.id;
  const whopPlanId = data.plan?.id;
  if (!whopMembershipId || !whopUserId || !whopPlanId) return;

  const user = await findUserByWhopId(whopUserId);
  if (!user) return;

  const currentPeriodEnd =
    toDate(data.current_period_end) ?? toDate(data.expires_at) ?? toDate(data.expiration_at);
  if (!currentPeriodEnd) return;

  await prisma.plusMembership.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      whopMembershipId,
      whopPlanId,
      status: "ACTIVE",
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      priceCents: Math.round((data.metadata?.amountCents as number | undefined) ?? 0),
    },
    update: {
      whopMembershipId,
      whopPlanId,
      status: "ACTIVE",
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    },
  });

  await prisma.notification.create({
    data: { userId: user.id, type: "PLUS_RENEWED", entityId: whopMembershipId },
  });
}

async function handleMembershipDeactivated(data: MembershipPayload) {
  const whopMembershipId = data.id;
  if (!whopMembershipId) return;
  await prisma.plusMembership.updateMany({
    where: { whopMembershipId },
    data: { status: "EXPIRED" },
  });
}

async function handlePaymentSucceeded(data: PaymentPayload) {
  const kind = data.metadata?.kind as string | undefined;

  if (kind === "tip") {
    await handleTipSucceeded(data); // defined alongside the tipping route below
    return;
  }

  const whopMembershipId = data.membership?.id ?? data.membership_id;
  if (whopMembershipId) {
    const existing = await prisma.plusMembership.findUnique({
      where: { whopMembershipId },
    });
    if (existing) {
      await prisma.plusMembership.update({
        where: { whopMembershipId },
        data: {
          status: "ACTIVE",
          priceCents: Math.round((data.subtotal ?? 0) * 100),
        },
      });
      await prisma.notification.create({
        data: { userId: existing.userId, type: "PLUS_RENEWED", entityId: whopMembershipId },
      });
    }
  }
}

async function handlePaymentFailed(_data: PaymentPayload) {
  // v1 relies on Whop's own dunning emails.
}

async function handleRefundCreated(data: RefundPayload) {
  const whopPaymentId = data.payment?.id;
  if (!whopPaymentId) return;
  await prisma.tip.updateMany({
    where: { whopPaymentId },
    data: { status: "REFUNDED" },
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let webhookData: WebhookData;
  try {
    webhookData = getWhop().webhooks.unwrap(bodyText, { headers }) as unknown as WebhookData;
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  const existing = await prisma.webhookEvent.findUnique({ where: { id: webhookData.id } });
  if (existing) return new Response("Already processed", { status: 200 });
  await prisma.webhookEvent.create({
    data: { id: webhookData.id, eventType: webhookData.type },
  });

  switch (webhookData.type) {
    case "membership.activated":
      waitUntil(handleMembershipActivated(webhookData.data as MembershipPayload));
      break;
    case "membership.deactivated":
      waitUntil(handleMembershipDeactivated(webhookData.data as MembershipPayload));
      break;
    case "payment.succeeded":
      waitUntil(handlePaymentSucceeded(webhookData.data as PaymentPayload));
      break;
    case "payment.failed":
      waitUntil(handlePaymentFailed(webhookData.data as PaymentPayload));
      break;
    case "refund.created":
      waitUntil(handleRefundCreated(webhookData.data as RefundPayload));
      break;
    default:
      break;
  }

  return new Response("OK", { status: 200 });
}
```

> **`await request.text()` first.** `webhooks.unwrap` HMACs the raw body; calling `request.json()` consumes the stream and breaks signature verification.
>
> **Idempotency via `WebhookEvent.id` unique constraint.** Insert before doing any work. Whop retries on non-200 and re-delivers on dropped connections — without this, a renewal can fire 2-3 notifications.
>
> **`payment.succeeded` is a multiplexer.** Branch on `metadata.kind` (`"plus"` here, `"tip"` below). The `handleTipSucceeded` function lives in this same file and is wired into this same switch.
>
> **`waitUntil` returns immediately while the work continues.** Whop's 10-second timeout never fires; if the work crashes, the WebhookEvent row already exists, so retries won't re-run it. If you want retries, only insert the WebhookEvent row after the handler succeeds.

---

## Writer onboarding and tipping

### Sub-company creation + KYC

Writers create a Whop sub-company under the platform's `parent_company_id`. KYC is skipped in sandbox; in production we redirect to Whop's hosted onboarding via `accountLinks.create`.

`src/app/api/writers/onboard/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";
import { env } from "@/lib/env";

export async function POST() {
  const user = await requireAuth({ include: { writerProfile: true } });
  const isSandbox = process.env.WHOP_SANDBOX === "true";
  const whop = getCompanyWhop();

  let writerCompanyId = user.writerProfile?.whopCompanyId;

  if (!writerCompanyId) {
    const company = await whop.companies.create({
      email: user.email,
      title: `${user.name ?? user.username}'s Storyline`,
      parent_company_id: env.WHOP_COMPANY_ID,
      metadata: { storyline_user_id: user.id },
    });
    writerCompanyId = company.id;

    await prisma.writerProfile.create({
      data: {
        userId: user.id,
        whopCompanyId: writerCompanyId,
        kycComplete: isSandbox,
        tippingEnabled: isSandbox,
      },
    });
  }

  if (isSandbox) {
    return NextResponse.json({ ok: true, kycComplete: true });
  }

  const link = await whop.accountLinks.create({
    company_id: writerCompanyId,
    use_case: "account_onboarding",
    return_url: `${env.NEXT_PUBLIC_APP_URL}/me/kyc-return`,
    refresh_url: `${env.NEXT_PUBLIC_APP_URL}/me/settings?kyc=refresh`,
  });

  return NextResponse.json({ ok: true, redirectUrl: link.url });
}
```

`src/app/api/writers/kyc-return/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await requireAuth({ include: { writerProfile: true } });
  if (!user.writerProfile) {
    return NextResponse.json({ error: "No writer profile" }, { status: 400 });
  }
  await prisma.writerProfile.update({
    where: { id: user.writerProfile.id },
    data: { kycComplete: true, tippingEnabled: true },
  });
  return NextResponse.json({ ok: true });
}
```

The `/me/kyc-return` page is a tiny client component that POSTs to this route then redirects to `/me/dashboard?kyc=complete`.

> **`accountLinks.create` is reusable.** Re-use the existing `whopCompanyId` to mint a fresh onboarding link whenever the writer needs to update KYC or bank details. Don't create a new company on each click.

### Embedded payout portal

The portal needs a short-lived access token scoped to the writer's sub-company. Generate it from a route that verifies they own the company.

`src/app/api/writers/payout-token/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCompanyWhop } from "@/lib/whop";

export async function GET(req: NextRequest) {
  const user = await requireAuth({ include: { writerProfile: true } });
  const companyId = req.nextUrl.searchParams.get("companyId");

  if (!companyId || companyId !== user.writerProfile?.whopCompanyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const token = await getCompanyWhop().accessTokens.create({ company_id: companyId });
    return NextResponse.json({ token: token.token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not mint token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

A `/api/writers/hosted-payout-link` companion route exists for browsers that block the iframe — calls `accountLinks.create` with `use_case: "payouts_portal"` and returns the hosted URL.

`src/components/payouts/PayoutPortal.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  Elements,
  PayoutsSession,
  BalanceElement,
  WithdrawElement,
  VerifyElement,
  AddPayoutMethodElement,
} from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import { env } from "@/lib/env-public";

interface Props {
  companyId: string;
  kycComplete: boolean;
}

export function PayoutPortal({ companyId, kycComplete }: Props) {
  const { resolvedTheme } = useTheme();
  const [embeddedOpen, setEmbeddedOpen] = useState(false);
  const isSandbox = env.NEXT_PUBLIC_WHOP_SANDBOX === "true";

  const elements = useMemo(
    () => loadWhopElements({ environment: isSandbox ? "sandbox" : "production" }),
    [isSandbox],
  );

  async function fetchToken(): Promise<string> {
    const res = await fetch(`/api/writers/payout-token?companyId=${companyId}`);
    if (!res.ok) throw new Error("Could not mint payout token");
    const data = (await res.json()) as { token?: string };
    if (!data.token) throw new Error("No token returned");
    return data.token;
  }

  return (
    <div className="space-y-6">
      {/* Toolbar with Open hosted portal + Show embedded portal toggle */}
      {embeddedOpen && (
        <Elements
          elements={elements}
          appearance={{
            theme: {
              appearance: resolvedTheme === "dark" ? "dark" : "light",
              accentColor: "green",
            },
          }}
        >
          <PayoutsSession
            token={fetchToken}
            companyId={companyId}
            redirectUrl={`${env.NEXT_PUBLIC_APP_URL}/me/dashboard`}
          >
            {!kycComplete && <VerifyElement />}
            <BalanceElement />
            <WithdrawElement />
            <AddPayoutMethodElement />
          </PayoutsSession>
        </Elements>
      )}
    </div>
  );
}
```

> **Payout token must be a function, not a string.** `<PayoutsSession token={fetchToken}>` — pass the async function so the SDK can refresh expired tokens. Pass a string and the session will die when the token expires.

`src/lib/env-public.ts` exists because client components can't import the server `env` module:

```ts
const publicSchema = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  NEXT_PUBLIC_WHOP_SANDBOX: process.env.NEXT_PUBLIC_WHOP_SANDBOX ?? "",
} as const;

export const env = publicSchema;
```

The writer dashboard (`/me/dashboard`) composes: stat cards (likes, stories, MTD reads, lifetime earnings) + Partner Program payout list + recent tips list + the embedded `<PayoutPortal>` (only renders when `writerProfile.kycComplete && whopCompanyId`).

### Tipping (writer-routed checkout with platform fee)

This is the core invariant. The checkout is created on the **writer's** connected sub-company with an `application_fee_amount` for the platform's cut.

`src/app/api/stories/[id]/tip/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";
import { env } from "@/lib/env";

const Schema = z.object({
  amountCents: z.number().int().min(100).max(50_000),
});

function checkoutEnvironment() {
  return process.env.WHOP_SANDBOX === "true" ? "sandbox" : "production";
}

function safeReturnUrl(req: NextRequest) {
  const appUrl = new URL(env.NEXT_PUBLIC_APP_URL);
  const referer = req.headers.get("referer");
  if (!referer) return appUrl.toString();
  try {
    const url = new URL(referer);
    if (url.origin === appUrl.origin) return url.toString();
  } catch {
    // Ignore malformed referer.
  }
  return appUrl.toString();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireAuth();
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  const { amountCents } = parsed.data;

  const story = await prisma.story.findUnique({
    where: { id },
    include: { author: { include: { writerProfile: true } } },
  });
  if (!story || story.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Story not available" }, { status: 404 });
  }
  if (story.author.id === user.id) {
    return NextResponse.json({ error: "Cannot tip your own story" }, { status: 400 });
  }
  if (!story.author.writerProfile?.kycComplete || !story.author.writerProfile.tippingEnabled) {
    return NextResponse.json(
      { error: "This writer hasn't enabled tipping yet" },
      { status: 400 },
    );
  }

  const feePercent = Number(env.TIP_PLATFORM_FEE_PERCENT);
  const feeCents = Math.max(1, Math.round((amountCents * feePercent) / 100));

  try {
    const returnUrl = safeReturnUrl(req);
    const checkout = await getCompanyWhop().checkoutConfigurations.create({
      ...(returnUrl.startsWith("https://") ? { redirect_url: returnUrl } : {}),
      source_url: returnUrl,
      plan: {
        company_id: story.author.writerProfile.whopCompanyId,
        initial_price: amountCents / 100,
        plan_type: "one_time",
        currency: "usd",
        application_fee_amount: feeCents / 100,
      },
      metadata: {
        kind: "tip",
        storyId: story.id,
        tipperUserId: user.id,
        writerUserId: story.author.id,
        amountCents: String(amountCents),
        applicationFeeCents: String(feeCents),
      },
    });
    if (!checkout.plan?.id) {
      return NextResponse.json({ error: "Whop did not return a plan for this checkout" }, { status: 502 });
    }
    return NextResponse.json({
      sessionId: checkout.id,
      planId: checkout.plan.id,
      environment: checkoutEnvironment(),
      returnUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not start tip";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

> **TIPPING INVARIANT.** Tips charge the **author's** connected Whop company via `application_fee_amount` for the platform's cut — `plan.company_id` MUST be the writer's `whopCompanyId`, never the platform's. Any seeded-author sandbox fallback that routes checkouts to the platform company (or to a different sandbox account) is DEMO-ONLY, must be behind explicit `DEMO_*` env vars, and must be removed before public GitHub / tutorial code. `initial_price` and `application_fee_amount` are **dollars** (divide stored cents by 100).

The tip-side webhook handler (lives in the `/api/webhooks/whop` file above; called from `handlePaymentSucceeded` when `metadata.kind === "tip"`):

```ts
async function handleTipSucceeded(data: PaymentPayload) {
  const meta = data.metadata ?? {};
  const storyId = meta.storyId as string | undefined;
  const tipperUserId = meta.tipperUserId as string | undefined;
  const writerUserId = meta.writerUserId as string | undefined;
  const amountCents = Number(meta.amountCents ?? Math.round((data.subtotal ?? 0) * 100));
  const applicationFeeCents = Number(meta.applicationFeeCents ?? 0);
  const whopPaymentId = data.id;

  if (!storyId || !tipperUserId || !writerUserId || !whopPaymentId || !amountCents) return;

  await prisma.tip.upsert({
    where: { whopPaymentId },
    create: {
      tipperUserId, writerUserId, storyId, amountCents, applicationFeeCents,
      whopPaymentId, status: "SUCCEEDED",
    },
    update: { status: "SUCCEEDED" },
  });

  await prisma.notification.create({
    data: { userId: writerUserId, type: "TIP_RECEIVED", entityId: storyId },
  });
}
```

The `TipPopup` UI is the same `<WhopCheckoutEmbed>` pattern used for Plus, with an amount picker before the embed: four preset chips ($1, $3, $5, $10) plus a custom input clamped to $1–$500. Pass `hidePrice` to the embed because the popup header already shows "Tip $X". The `TipButton` only renders when `viewer.id !== story.author.id && writerProfile.kycComplete && writerProfile.tippingEnabled`.

---

## Partner Program (monthly revenue share)

### Read tracking

`src/components/TrackRead.tsx` fires once after 30s dwell via `fetch(..., { keepalive: true })`. The route is the gatekeeper.

`src/app/api/stories/[id]/read/route.ts` only writes a `StoryRead` row if: user is signed in, story is `PUBLISHED` and `visibility === "PLUS"`, reader is not the author, and reader has `plusMembership.status === "ACTIVE"` with `currentPeriodEnd > now`. Upsert is keyed on `userId_storyId_monthBucket` so re-reads in the same month don't duplicate. `monthBucket` is `YYYY-MM` (UTC).

### Cron declaration

`vercel.ts` (full CSP file in file 1):

```ts
crons: [
  { path: "/api/cron/partner-payout", schedule: "0 0 1 * *" },
],
```

Vercel hits this on the 1st of every month at 00:00 UTC with `Authorization: Bearer ${CRON_SECRET}`.

### `src/app/api/cron/partner-payout/route.ts`

```ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";
import { env } from "@/lib/env";

function previousMonthBucket(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

interface PayoutRow {
  writerUserId: string;
  reads: number;
  shareCents: number;
}

async function runPartnerPayout(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.endsWith(env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const overrideBucket = url.searchParams.get("monthBucket");
  const monthBucket = overrideBucket || previousMonthBucket();

  // 1. Compute the pool from active Plus members × monthly price × (1 - platform fee)
  const activeMembers = await prisma.plusMembership.count({
    where: { status: { in: ["ACTIVE", "CANCELED"] } },
  });
  const monthlyPriceCents = Math.round(Number(env.STORYLINE_PLUS_MONTHLY_PRICE) * 100);
  const grossRevenueCents = activeMembers * monthlyPriceCents;
  const platformPct = Number(env.PLATFORM_PLUS_FEE_PERCENT);
  const poolCents = Math.floor((grossRevenueCents * (100 - platformPct)) / 100);

  // 2. Aggregate reads per story → per writer
  const readsByStory = await prisma.storyRead.groupBy({
    by: ["storyId"],
    where: { monthBucket },
    _count: { _all: true },
  });

  if (readsByStory.length === 0 || poolCents === 0) {
    return NextResponse.json({
      ok: true, monthBucket, activeMembers, grossRevenueCents, poolCents,
      writerCount: 0, transfers: [],
    });
  }

  const stories = await prisma.story.findMany({
    where: { id: { in: readsByStory.map((r) => r.storyId) } },
    select: { id: true, authorUserId: true },
  });
  const writerByStory = new Map(stories.map((s) => [s.id, s.authorUserId]));

  const writerReads = new Map<string, number>();
  for (const r of readsByStory) {
    const writerId = writerByStory.get(r.storyId);
    if (!writerId) continue;
    writerReads.set(writerId, (writerReads.get(writerId) ?? 0) + r._count._all);
  }
  const totalReads = Array.from(writerReads.values()).reduce((a, b) => a + b, 0);
  if (totalReads === 0) {
    return NextResponse.json({
      ok: true, monthBucket, activeMembers, grossRevenueCents, poolCents,
      writerCount: 0, transfers: [],
    });
  }

  // 3. Compute per-writer share (proportional to reads), skip below minimum and uncomplete-KYC
  const minPayoutCents = Math.round(Number(env.PARTNER_PAYOUT_MIN_USD) * 100);

  const writers = await prisma.user.findMany({
    where: { id: { in: Array.from(writerReads.keys()) } },
    select: {
      id: true, username: true,
      writerProfile: { select: { whopCompanyId: true, kycComplete: true } },
    },
  });

  const rows: (PayoutRow & { whopCompanyId: string })[] = [];
  for (const writer of writers) {
    if (!writer.writerProfile?.kycComplete) continue;
    const reads = writerReads.get(writer.id) ?? 0;
    const shareCents = Math.floor((reads / totalReads) * poolCents);
    if (shareCents < minPayoutCents) continue;
    rows.push({
      writerUserId: writer.id,
      reads,
      shareCents,
      whopCompanyId: writer.writerProfile.whopCompanyId,
    });
  }

  // 4. Skip writers already paid for this bucket (idempotency layer 1)
  const existing = await prisma.partnerPayout.findMany({
    where: {
      monthBucket,
      writerUserId: { in: rows.map((r) => r.writerUserId) },
    },
    select: { writerUserId: true },
  });
  const alreadyPaid = new Set(existing.map((p) => p.writerUserId));
  const eligible = rows.filter((r) => !alreadyPaid.has(r.writerUserId));

  // 5. Loop: transfer per writer, then write the audit row
  const whop = getCompanyWhop();
  const results: { writerUserId: string; status: "SENT" | "FAILED"; transferId?: string; error?: string }[] = [];

  for (const row of eligible) {
    try {
      const transfer = await whop.transfers.create({
        amount: row.shareCents / 100,
        currency: "usd",
        origin_id: env.WHOP_COMPANY_ID,
        destination_id: row.whopCompanyId,
        idempotence_key: `partner-payout-${row.writerUserId}-${monthBucket}`,
        metadata: {
          kind: "partner_payout",
          monthBucket,
          writerUserId: row.writerUserId,
        },
        notes: `Storyline Partner Program · ${monthBucket}`,
      });

      await prisma.partnerPayout.create({
        data: {
          writerUserId: row.writerUserId,
          monthBucket,
          totalReads: row.reads,
          revenueShareCents: row.shareCents,
          whopTransferId: transfer.id,
          status: "SENT",
          sentAt: new Date(),
        },
      });
      await prisma.notification.create({
        data: { userId: row.writerUserId, type: "PAYOUT_SENT", entityId: transfer.id },
      });
      results.push({ writerUserId: row.writerUserId, status: "SENT", transferId: transfer.id });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "Unknown";
      await prisma.partnerPayout.create({
        data: {
          writerUserId: row.writerUserId,
          monthBucket,
          totalReads: row.reads,
          revenueShareCents: row.shareCents,
          status: "FAILED",
          failureReason: reason,
        },
      });
      results.push({ writerUserId: row.writerUserId, status: "FAILED", error: reason });
    }
  }

  return NextResponse.json({
    ok: true,
    monthBucket, activeMembers, grossRevenueCents, poolCents, totalReads,
    writerCount: results.length,
    transfers: results,
  });
}

export const GET = runPartnerPayout;
export const POST = runPartnerPayout;
```

> **Gotchas for the cron:**
>
> - **Vercel Cron sends GET, not POST.** Export both `GET` and `POST` from the route — handling only POST means the scheduled run silently fails.
> - **Auth is `authorization.endsWith(CRON_SECRET)`** — Vercel sends `Bearer <secret>`, so endsWith works on both raw and bearer forms.
> - **Double idempotency.** `partner-payout-{writerUserId}-{monthBucket}` as `idempotence_key` on `whop.transfers.create` prevents Whop from paying twice; the `PartnerPayout` table check before the loop prevents the second run from even attempting. Re-running the same `monthBucket` returns `writerCount: 0`.
> - **70/30 split** is `env.PLATFORM_PLUS_FEE_PERCENT` (configurable, defaults imply 30% platform / 70% pool). The pool is divided proportionally by reads.
> - **Sub-dollar shares are skipped silently** via `PARTNER_PAYOUT_MIN_USD` — transfer fees would exceed the payout.
> - **Test by curl:** `curl -H "authorization: Bearer $CRON_SECRET" "https://...vercel.app/api/cron/partner-payout?monthBucket=2026-05"`.

---

## Discovery surfaces

The home page at `/` has two branches. Signed out: a marketing hero with the headline ("Writing that pays.") and CTAs on the left, a fanned static-WebP stack of three published story cards on the right (`public/hero-stack.webp`, served via `next/image priority` as the LCP element — generation script details in file 1), and a trending strip below ordered by `[likesTotal desc, publishedAt desc]`. Signed in: a two-column grid — the main column shows a "From writers you follow" rail (top 3 by `publishedAt`, only when the viewer follows anyone) above a "Latest" feed of the 20 newest stories; the sticky right rail shows a Plus upsell card (hidden if `plusMembership.status === "ACTIVE"`), a "Who to follow" list (top 4 writers by follower count, excluding self and already-followed), and a "Recommended topics" cloud (topics with stories, sorted so followed topics float first, then by story count).

Topic pages live at `/tag/[slug]` (a header with the topic name, `<TopicFollowButton>`, optional description, and the topic's published stories ordered by `publishedAt desc`) and `/topics` (a directory of all topics). The search page at `/search` is server-rendered: a single form posts `?q=` back to itself, results come from a Prisma `findMany` with `OR` on `title`/`subtitle`/`excerpt` using `contains` + `mode: "insensitive"`, ordered by `[likesTotal desc, publishedAt desc]`, capped at 30. No client-side debounce — search-as-you-submit. Profile pages at `/@username` are introduced in file 1. Every page is wrapped by `<AppShell>` in `src/app/layout.tsx`, which renders `<TopNav>`, a `<SidebarProvider>`-backed `<LeftSidebar>` (signed-in only — collapsed state lives in a cookie), and `<Footer>`. The left sidebar's "Following" section is fed by the top 5 most-recent `Follow` rows for the viewer.

> Search is intentionally `contains` on three columns — no Postgres FTS index, no trigram. Good enough for v1; swap to `pg_trgm` or `tsvector` later if quality matters.

---

## Likes, bookmarks, follows

### Engagement routes (representative example)

Four toggle routes, all server-side guards on `requireAuth()` + the target's existence. Like is the most complex because it bumps a denormalized count, fires a notification with dedupe, and reads back the fresh count:

```ts
// src/app/api/stories/[id]/like/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireAuth();

  const story = await prisma.story.findUnique({
    where: { id },
    select: { id: true, authorUserId: true, status: true },
  });
  if (!story || story.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Story not available" }, { status: 404 });
  }

  const existing = await prisma.like.findUnique({
    where: { userId_storyId: { userId: user.id, storyId: id } },
    select: { id: true },
  });

  const liked = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.like.delete({ where: { id: existing.id } });
      await tx.story.update({ where: { id }, data: { likesTotal: { decrement: 1 } } });
      return false;
    }
    await tx.like.create({ data: { userId: user.id, storyId: id } });
    await tx.story.update({ where: { id }, data: { likesTotal: { increment: 1 } } });
    return true;
  });

  if (liked && story.authorUserId !== user.id) {
    const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const recent = await prisma.notification.findFirst({
      where: {
        userId: story.authorUserId,
        type: "LIKE",
        entityId: story.id,
        read: false,
        createdAt: { gte: cutoff },
      },
      select: { id: true },
    });
    if (!recent) {
      await prisma.notification.create({
        data: { userId: story.authorUserId, type: "LIKE", entityId: story.id },
      });
    }
  }

  const fresh = await prisma.story.findUnique({
    where: { id },
    select: { likesTotal: true },
  });

  return NextResponse.json({ liked, likesTotal: fresh?.likesTotal ?? 0 });
}
```

The other three are simpler variants of the same find-or-create-or-delete pattern:

- **`/api/stories/[id]/bookmark`** — toggles a `Bookmark` row. No count, no notification. Returns `{ bookmarked: boolean }`.
- **`/api/users/[username]/follow`** — toggles a `Follow` row by `followerUserId_followedUserId` composite key, 400s on self-follow. Inserts a `FOLLOWED` notification on follow (no dedupe — unfollow/refollow is intentionally noisy). Returns `{ following: boolean }`.
- **`/api/topics/[slug]/follow`** — toggles a `TopicFollow` row by `userId_topicId`. No notification. Returns `{ following: boolean }`.

Every client button (`<LikeButton>`, `<BookmarkButton>`, `<FollowButton>`, `<TopicFollowButton>`) is the same `useOptimistic` + `useTransition` shape: redirect to `/api/auth/login?returnTo=...` if not authenticated, apply the optimistic flip inside `startTransition`, fire-and-forget POST, reconcile from the server's response on success. Like also keeps an integer count alongside the boolean.

> The like-notification dedupe is a 24h window per `(userId, storyId, read=false)` — a re-like inside that window doesn't fire a second notification. Once the author marks notifications read, the next like fires again. Follows don't dedupe.

### Notifications

`Notification` rows are inserted at the moment the engagement happens (like route, follow route) and from the webhook handler above (`PLUS_RENEWED`, `TIP_RECEIVED`, `PAYOUT_SENT`). Each row stores `userId`, `type`, `entityId` (a story ID for `LIKE`/`TIP_RECEIVED`, a user ID for `FOLLOWED`, a membership ID for `PLUS_RENEWED`, a transfer ID for `PAYOUT_SENT`), `read`, `createdAt`. There is no creation helper — every site that fires a notification calls `prisma.notification.create` inline.

The list endpoint hydrates `entityId` into a human-readable body and a deep link in one round-trip:

```ts
// src/app/api/notifications/route.ts — body
export async function GET() {
  const user = await requireAuth();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const storyIds = notifications.filter((n) => n.type === "LIKE").map((n) => n.entityId);
  const followerIds = notifications.filter((n) => n.type === "FOLLOWED").map((n) => n.entityId);
  const tipStoryIds = notifications.filter((n) => n.type === "TIP_RECEIVED").map((n) => n.entityId);

  const [likeStories, followers, tipStories] = await Promise.all([
    storyIds.length
      ? prisma.story.findMany({
          where: { id: { in: storyIds } },
          select: { id: true, title: true, slug: true, author: { select: { username: true } } },
        })
      : Promise.resolve([]),
    followerIds.length
      ? prisma.user.findMany({
          where: { id: { in: followerIds } },
          select: { id: true, username: true, name: true },
        })
      : Promise.resolve([]),
    tipStoryIds.length
      ? prisma.story.findMany({
          where: { id: { in: tipStoryIds } },
          select: { id: true, title: true, slug: true, author: { select: { username: true } } },
        })
      : Promise.resolve([]),
  ]);
  // ...build items[] by switch on n.type, attaching href + body...
  return NextResponse.json({ items, unread });
}
```

`/api/notifications/mark-read` is a one-line `updateMany({ where: { userId, read: false }, data: { read: true } })`.

The bell is a popover: a server component `<NotificationBell>` queries the unread count for the initial paint, then renders the client `<NotificationsMenu>`. The menu only fetches `/api/notifications` when the dropdown opens (`useEffect` keyed on `open`, with an `AbortController` to cancel stale requests). On open, it optimistically zeros the local unread badge and fires `mark-read` in the background — fire-and-forget; rollback isn't worth the complexity. Each row is a `<Link>` to `n.href` (story page for likes/tips, profile for follows, `/me/dashboard` for payouts, `/me/membership` for renewals).

---

## Operators and promo codes

### Operator allowlist

`src/lib/auth.ts` adds an operator gate on top of the auth helpers from file 1. The root operator is upserted on every admin access from `ROOT_OPERATOR_EMAIL` so the platform is never locked out. Invited operators are linked to their Whop user on first sign-in.

```ts
export async function requireWriter() {
  const user = await requireAuth({ include: { writerProfile: true } });
  if (!user.writerProfile?.kycComplete) redirect("/me/settings?onboard=true");
  return user;
}

export async function isOperator(userId: string, email?: string | null) {
  await ensureRootOperator();
  if (email) {
    await prisma.operator.updateMany({
      where: { email: email.toLowerCase(), userId: null },
      data: { userId },
    });
  }
  const row = await prisma.operator.findFirst({ where: { userId } });
  return Boolean(row);
}

export async function requireOperator() {
  const user = await requireAuth();
  if (!(await isOperator(user.id, user.email))) redirect("/");
  return user;
}

export async function ensureRootOperator() {
  const email = (process.env.ROOT_OPERATOR_EMAIL || "").toLowerCase();
  if (!email) return;
  const matchingUser = await prisma.user.findUnique({ where: { email } });
  await prisma.operator.upsert({
    where: { email },
    create: { email, userId: matchingUser?.id ?? null, addedByUserId: null },
    update: { userId: matchingUser?.id ?? null },
  });
}
```

`POST /api/admin/operators` accepts `{ email }`, refuses duplicates, looks up an existing user by email (auto-link if found, otherwise pending) and creates the row with `addedByUserId: me.id`. `DELETE /api/admin/operators/[id]` blocks deletion when `addedByUserId === null` (root).

### Promo codes

Promo codes are created in Whop (so they work at checkout) AND mirrored locally (for usage stats and archive).

`src/app/api/promo-codes/route.ts` (POST):

```ts
const whopPromo = await getCompanyWhop().promoCodes.create({
  company_id: env.WHOP_COMPANY_ID,
  code,
  promo_type: "percentage",
  amount_off: parsed.data.discountPercent,
  base_currency: "usd",
  plan_ids: [env.STORYLINE_PLUS_PLAN_ID],
  promo_duration_months: 1,
  new_users_only: false,
  ...(parsed.data.validUntil ? { expires_at: parsed.data.validUntil } : {}),
  ...(parsed.data.maxUses
    ? { stock: parsed.data.maxUses, unlimited_stock: false }
    : { unlimited_stock: true }),
});

const row = await prisma.promoCode.create({
  data: {
    code,
    whopPromoCodeId: whopPromo.id,
    discountPercent: parsed.data.discountPercent,
    validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
    maxUses: parsed.data.maxUses ?? null,
    createdByUserId: me.id,
  },
});
```

`POST /api/promo-codes/[id]/archive` sets `archivedAt: new Date()` — doesn't touch Whop, just hides the row in admin.

Admin pages: `/admin/operators` (list + invite-by-email form + remove confirmation) and `/admin/promo-codes` (list + create form for code/percent/validUntil/maxUses + archive button), both gated by `requireOperator()`.

---

## Production switch

### Env vars: sandbox → prod

| Variable | Sandbox | Production |
|---|---|---|
| `WHOP_APP_API_KEY` | sandbox key | production key |
| `WHOP_CLIENT_ID` | sandbox OAuth client | production OAuth client |
| `WHOP_CLIENT_SECRET` | sandbox secret | production secret |
| `WHOP_COMPANY_API_KEY` | sandbox key | production key |
| `WHOP_COMPANY_ID` | sandbox biz id | production biz id |
| `STORYLINE_PLUS_PLAN_ID` | sandbox plan | re-run `scripts/create-plus-plan.ts` against prod creds |
| `WHOP_WEBHOOK_SECRET` | sandbox webhook secret | production webhook secret |
| `WHOP_SANDBOX` | `true` | `false` or unset |
| `NEXT_PUBLIC_WHOP_SANDBOX` | `true` | `false` or unset |
| `NEXT_PUBLIC_APP_URL` | preview URL | `https://yourdomain.com` (no trailing slash, MUST be HTTPS) |
| `SESSION_SECRET` | dev value | rotate (`openssl rand -hex 32`) |
| `CRON_SECRET` | dev value | rotate (`openssl rand -hex 32`) |

Also tighten CSP in `vercel.ts` (file 1): remove `https://sandbox-js.whop.com` from `script-src` (production only loads from `https://js.whop.com`).

### Demo-only fallbacks

The sandbox flow bypasses Whop's hosted KYC and pre-flips `kycComplete`/`tippingEnabled` on the writer profile. These are the only sandbox-gated branches; both check `WHOP_SANDBOX === "true"` (server) or `NEXT_PUBLIC_WHOP_SANDBOX === "true"` (client).

Server-side gate in `/api/writers/onboard` (full file above):

```ts
const isSandbox = process.env.WHOP_SANDBOX === "true";

// ...creates company always...
await prisma.writerProfile.create({
  data: {
    userId: user.id,
    whopCompanyId: writerCompanyId,
    kycComplete: isSandbox,      // DEMO: auto-true in sandbox
    tippingEnabled: isSandbox,   // DEMO: auto-true in sandbox
  },
});

if (isSandbox) {
  return NextResponse.json({ ok: true, kycComplete: true });
}
// production path falls through to whop.accountLinks.create
```

Client gate in `EnablePayoutsButton.tsx` swaps the modal copy:

```tsx
const isSandbox = process.env.NEXT_PUBLIC_WHOP_SANDBOX === "true";
// copy: "Demo mode: KYC will be skipped" vs "You'll be redirected to Whop's hosted verification"
// button: "Skip KYC, enable payouts" vs "Continue to Whop verification"
```

The seeded users in `prisma/seed.ts` all have `whopUserId` starting with `seed_user_`. Wipe before launch:

```ts
// prisma/seed-clear.ts
const deleted = await prisma.user.deleteMany({
  where: { whopUserId: { startsWith: "seed_user_" } },
});
```

Run `npx tsx prisma/seed-clear.ts`. (The Neon DB is shared across Vercel envs — this wipes preview and dev too. Re-run `npx tsx prisma/seed.ts` to restore.)

> **TIPPING INVARIANT, restated for production.** The tipping route always points `plan.company_id` at `story.author.writerProfile.whopCompanyId`. Confirm there is NO seeded-author fallback that routes a tip checkout to `env.WHOP_COMPANY_ID` or a hard-coded sandbox company — that would make every tip go to the platform instead of the writer. Any such fallback must be DEMO-only, behind a `DEMO_*` env var, and stripped before public GitHub code.

### Preflight + deploy

`scripts/preflight-prod.ts` validates required env vars are set and non-placeholder, asserts both `WHOP_SANDBOX` and `NEXT_PUBLIC_WHOP_SANDBOX` are not `"true"`, checks `WHOP_WEBHOOK_SECRET` for trailing whitespace, calls `whop.plans.retrieve(STORYLINE_PLUS_PLAN_ID)` to confirm the production plan exists, and warns on CSP / non-HTTPS `NEXT_PUBLIC_APP_URL`. Exits non-zero on any fail. Run with `npx tsx scripts/preflight-prod.ts`.

Deploy steps:

1. In Whop production company dashboard: create the app, copy App API key + Client ID/Secret + Company API key.
2. Register OAuth redirect URI `https://yourdomain.com/api/auth/callback` (must match `WHOP_REDIRECT_URI` character-for-character — including trailing slash).
3. Run plan creation script against prod creds: `WHOP_COMPANY_API_KEY=apik_prod_xxx WHOP_COMPANY_ID=biz_prod_xxx WHOP_SANDBOX=false npx tsx scripts/create-plus-plan.ts` — save the printed `plan_id` as production `STORYLINE_PLUS_PLAN_ID`.
4. Register production webhook at `https://yourdomain.com/api/webhooks/whop` for events: `payment_succeeded`, `payment_failed`, `membership_activated`, `membership_deactivated`, `refund_created`. Save the signing secret as production `WHOP_WEBHOOK_SECRET`.
5. Swap all Whop env vars in Vercel Production env (table above), pull locally with `vercel env pull .env.local --environment=production`.
6. Run `npx tsx prisma/seed-clear.ts` to remove fictional writers.
7. Run preflight; fix any `[FAIL]`.
8. Tighten CSP in `vercel.ts` (drop `sandbox-js.whop.com`).
9. `vercel deploy --prod`.

Production smoke test: sign in via real Whop OAuth, subscribe to Plus with a real card, enable payouts as a writer (real KYC, no bypass), tip $1 from a different account (real money), trigger cron with curl + `CRON_SECRET` — confirm `whop.transfers.create` actually moves funds to the writer's connected company.

---

## Whop SDK + project gotchas

1. **Two Whop clients, both factory functions.** `getWhop()` uses the App API key (OAuth + webhook verification). `getCompanyWhop()` uses the Company API key (resource creation — products, plans, promo codes, transfers). Reading `process.env` at module load means imports hoist above `dotenv.config()` and sandbox routes silently 404 into prod — keep them as functions.
2. **`/api/v1` suffix is mandatory** on `baseURL`. Without it every SDK call 404s into production regardless of `WHOP_SANDBOX`.
3. **`nonce` is required** in the OAuth `/authorize` URL whenever `scope` includes `openid`. OAuth 2.1 treats it as optional; Whop does not.
4. **Whop's `/oauth/token` wants JSON, not form-urlencoded**, and requires `client_secret` in the body even with PKCE. Either mistake returns `400 invalid_client`.
5. **Raw body before parse.** `whop.webhooks.unwrap` HMACs the raw text body. Always `await request.text()` first — calling `request.json()` consumes the stream and breaks signature verification.
6. **Webhook idempotency via `WebhookEvent.id` unique constraint.** Insert the row before doing any work, so retries no-op. Whop redelivers on dropped connections and non-200 responses; without this, a single renewal can fire 2-3 notifications.
7. **`payment.succeeded` is a multiplexer.** Branch on `metadata.kind` (`"plus"` vs `"tip"`). The same webhook handler covers both Plus subscriptions and writer tips; the same `<WhopCheckoutEmbed>` component creates both.
8. **`{PAYMENT_ID}` is not used here.** Unlike some Whop guides, Storyline relies on the webhook to settle payments, not redirect-URL templating. `redirect_url` just sends the user back to the right page; the source of truth is the webhook.
9. **`waitUntil` for webhook work.** Wrap async handlers in `waitUntil` from `@vercel/functions` so the 200 returns immediately and Whop's 10s timeout never fires. The `WebhookEvent` row already exists, so retries won't re-run work.
10. **`initial_price` + `application_fee_amount` are dollars, not cents.** Both `checkoutConfigurations.create` and the Transfers API take dollar amounts. Divide your stored cents by 100.
11. **`redirect_url` must be `https://`.** Whop rejects `http://localhost`. Strip the field when developing locally — the SDK shape lets you omit it.
12. **Embed `environment` must match.** `<WhopCheckoutEmbed environment={env}>` must match the sandbox/prod env that minted the session, or the embed silently 404s. Mirror the server's `WHOP_SANDBOX` to client via `NEXT_PUBLIC_WHOP_SANDBOX`.
13. **Sub-company creation uses `parent_company_id`.** `whop.companies.create({ parent_company_id: WHOP_COMPANY_ID, title, email })` creates the writer's company *under* the platform. Skip this and you can't take an `application_fee_amount`.
14. **`accountLinks.create` is reusable.** Don't create a new company on every "Enable payouts" click. Re-use the writer's existing `whopCompanyId` and mint a fresh onboarding link whenever they need to update KYC.
15. **`accessTokens.create` must be a function.** `<PayoutsSession token={fetchToken}>` — pass the async function so the SDK can refresh expired tokens. Pass a string and the session dies when the token expires.
16. **`loadWhopElements({ environment })` reads the env hint.** Pass `"sandbox"` or `"production"` explicitly; the embedded components don't infer it from anything else.
17. **`transfers.create` uses `origin_id` → `destination_id`** with `idempotence_key` for safe retries. Source of truth is the **company** key, since transfers are platform-initiated.
18. **Vercel Cron sends GET, not POST.** Export both `GET` and `POST` from cron routes — handling only POST means the scheduled run silently fails. Validate auth via `authorization.endsWith(CRON_SECRET)` so both raw and bearer forms work.
19. **Two-layer payout idempotency.** Whop's `idempotence_key` on `transfers.create` plus the local `PartnerPayout @@unique([writerUserId, monthBucket])` constraint mean re-running the same `monthBucket` returns `writerCount: 0` and Whop never doubles a payout.
20. **OAuth redirect URI must match exactly.** The value in the Whop dashboard, the value in `WHOP_REDIRECT_URI`, and the value in the auth URL all have to match character-for-character — including trailing slashes.
21. **Whitelist external image hosts for `next/image`.** Add `utfs.io` (UploadThing), `assets.whop.com`, `cdn.whop.com`, and `ui-avatars.com` to `next.config.ts` → `images.remotePatterns`. Without it, every cover/avatar errors at runtime.
22. **CSP allowlists Whop's JS hosts.** `vercel.ts` lists `https://js.whop.com` (prod) and `https://sandbox-js.whop.com` (sandbox) under `script-src`, plus `frame-src 'self' https://*.whop.com` for the embedded checkout iframe. Drop the sandbox host in production.
23. **No `proxy.ts`.** Storyline does server-side enforcement in each Server Component / layout via `requireAuth()` / `requireOperator()` / `requireWriter()` — no global Next.js 16 proxy. Easier to reason about, no edge-runtime constraints.
24. **`immediatelyRender: false` for TipTap inside Server Components.** Skip this and the editor crashes during hydration because the DOM isn't ready when TipTap tries to mount.
25. **Paywall enforcement is server-side rendering, not a CSS hide.** The truncated `JSONContent` array is sliced *before* it leaves the server — the paid content never reaches a non-Plus browser.
26. **TIPPING INVARIANT (repeated).** Tips charge the writer's connected Whop company via `application_fee_amount`. Never route a tip to the platform's `WHOP_COMPANY_ID`. Sandbox demos that fall back to the platform company must be `DEMO_*`-gated and removed before public GitHub code.

---

That's the whole tutorial in two files. To rebuild Storyline from scratch, work in order: foundation + editor (file 1) → payments + engagement + launch (file 2). Cross-check anything that smells weird against the gotchas list above.
