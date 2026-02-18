# Swaphause (StockX clone) Guide — Part 2: Matching Engine, Payments & Products

This part covers the bid/ask matching engine, Whop payment integration (checkout, webhooks, escrow), seller onboarding, and product pages. Assumes Part 1 is complete (env vars, auth, Prisma schema, Whop SDK initialized).

## Shared constants — `src/constants/index.ts`

Key values used throughout the app:
- `PLATFORM_FEE_PERCENT = 9.5` — platform's cut of every trade
- `MIN_BID_PRICE = 1`, `MAX_BID_PRICE = 100_000` — price boundaries
- `BID_EXPIRY_DAYS = 30` — default bid expiration
- `CATEGORIES = ["Sneakers", "Streetwear", "Electronics", "Collectibles", "Accessories", "Trading Cards"]`
- `ORDER_STATUSES` — maps TradeStatus enums to display labels
- `ITEMS_PER_PAGE = 24` — pagination default

## Matching engine — `src/lib/matching-engine.ts`

The matching engine runs when a new bid or ask is created. It exports two functions: `matchBid(bidId)` and `matchAsk(askId)`.

**Algorithm (matchBid):**
1. Fetch the bid, confirm it's `ACTIVE`
2. Find the lowest `ACTIVE` ask for the same `productSizeId` where `ask.price <= bid.price`
3. If no match found, return null
4. Open a Prisma `$transaction` — re-fetch both records inside the transaction to confirm they're still `ACTIVE` (prevents race conditions from concurrent requests)
5. Trade executes at the **ask price** (seller's price)
6. Calculate `platformFee = tradePrice * (PLATFORM_FEE_PERCENT / 100)`
7. Mark both bid and ask as `MATCHED`
8. Create a `Trade` record with status `MATCHED`
9. Update `ProductSize` cached stats (lowestAsk, highestBid, lastSalePrice)
10. Create notifications for both buyer and seller
11. After the transaction, call `setupTradeChat()` — creates a Whop DM channel between buyer and seller, sends initial system message

`matchAsk` mirrors this but finds the highest bid >= ask price. Both use the same double-check-inside-transaction pattern.

**Key pattern:** The engine checks for matches **outside** the transaction first (fast path), then re-validates **inside** the transaction (safe path). This prevents two concurrent requests from matching against the same counterparty.

**On match, the `BidForm` component** detects `{ matched: true, trade: { id } }` in the API response, calls `POST /api/trades/{tradeId}/checkout` to get a checkout URL, and redirects the buyer to Whop's payment page.

## Bid/Ask API routes

`POST /api/bids` and `POST /api/asks` follow the same pattern:
- Authenticate via `requireAuth()`
- Validate body with Zod: `productSizeId` (string), `price` (positive number within min/max), `expiresAt` (optional future ISO date)
- Confirm `ProductSize` exists
- Create the Bid/Ask record with status `ACTIVE`
- Run the matching engine — if matched, return the trade
- In-memory rate limiter per user ID

## Seller onboarding

Before sellers can receive payouts, they need a Whop connected account with completed KYC. ([Enroll connected accounts](https://docs.whop.com/developer/platforms/enroll-connected-accounts))

**Flow:**
1. Seller signs up via Whop OAuth (already in Part 1)
2. Seller clicks "Start Selling" — platform calls `POST /api/sellers/onboard`
3. The route creates a child company via `whopsdk.companies.create()` with `parent_company_id: env.WHOP_COMPANY_ID` ([Create company](https://docs.whop.com/api-reference/companies/create-company))
4. Creates an account link via `whopsdk.accountLinks.create()` with `use_case: "account_onboarding"` — returns a Whop-hosted KYC page URL ([Create account link](https://docs.whop.com/api-reference/account-links/create-account-link))
5. Seller completes identity verification, adds payout method
6. Platform stores the seller's `connectedAccountId` on their User record

**Gating:** The `AskForm` component and Dashboard Selling tab check `user.connectedAccountId` via a `useCurrentUser` hook. If null, show "Become a Seller" button instead of the ask form.

## Payment service — `src/services/whop.ts`

Wraps the Whop SDK for all payment operations. ([Accept payments](https://docs.whop.com/developer/guides/accept-payments) | [Collect payments for connected accounts](https://docs.whop.com/developer/platforms/collect-payments-for-connected-accounts))

```typescript
import { whopsdk } from "@/lib/whop";
import { env } from "@/lib/env";

interface TradeForCheckout {
  id: string;
  price: number;
  platformFee: number;
  buyerId: string;
  sellerId: string;
  seller: {
    whopId: string;
    connectedAccountId?: string | null;
  };
}

interface CheckoutResult {
  checkoutUrl: string;
  checkoutId: string;
}

export async function createCheckoutForTrade(
  trade: TradeForCheckout
): Promise<CheckoutResult> {
  if (!trade.seller.connectedAccountId) {
    throw new Error("Seller does not have a connected Whop account");
  }

  const checkoutConfig = await whopsdk.checkoutConfigurations.create({
    redirect_url: `${env.NEXT_PUBLIC_APP_URL}/api/trades/${trade.id}/payment-callback`,
    plan: {
      company_id: trade.seller.connectedAccountId,
      currency: "usd",
      initial_price: trade.price,
      plan_type: "one_time",
      application_fee_amount: trade.platformFee,
    },
    metadata: {
      tradeId: trade.id,
      buyerId: trade.buyerId,
      sellerId: trade.sellerId,
    },
  });

  if (!checkoutConfig || !checkoutConfig.id) {
    throw new Error("Failed to create checkout session");
  }

  return {
    checkoutUrl: checkoutConfig.purchase_url as string,
    checkoutId: checkoutConfig.id,
  };
}

export async function getPaymentStatus(paymentId: string) {
  return whopsdk.payments.retrieve(paymentId);
}

export async function refundPayment(paymentId: string) {
  return whopsdk.payments.refund(paymentId);
}

export async function createTransfer(
  amount: number,
  originCompanyId: string,
  destinationCompanyId: string,
  metadata: Record<string, string>
) {
  return whopsdk.transfers.create({
    amount,
    currency: "usd",
    origin_id: originCompanyId,
    destination_id: destinationCompanyId,
    metadata,
  });
}
```

> Key: `company_id` and `currency` go **inside** the `plan` object. `redirect_url` tells Whop where to send the buyer after payment — Whop appends `?payment_id=pay_xxx&checkout_status=success`. ([Create checkout configuration](https://docs.whop.com/api-reference/checkout-configurations/create-checkout-configuration))

## Payment orchestration — `src/services/payments.ts`

```typescript
import { TradeStatus, PaymentStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCheckoutForTrade, refundPayment } from "@/services/whop";

export async function initiatePayment(tradeId: string) {
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: {
      seller: true,
      productSize: { include: { product: true } },
    },
  });

  if (!trade) throw new Error("Trade not found");
  if (trade.status !== TradeStatus.MATCHED) {
    throw new Error(`Trade is in ${trade.status} state, expected MATCHED`);
  }

  const checkout = await createCheckoutForTrade({
    id: trade.id,
    price: trade.price,
    platformFee: trade.platformFee,
    buyerId: trade.buyerId,
    sellerId: trade.sellerId,
    seller: {
      whopId: trade.seller.whopId,
      connectedAccountId: trade.seller.connectedAccountId,
    },
  });

  await prisma.trade.update({
    where: { id: trade.id },
    data: { status: TradeStatus.PAYMENT_PENDING },
  });

  return checkout;
}

export async function processRefund(tradeId: string) {
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { payment: true, ask: true, productSize: { include: { product: true } } },
  });

  if (!trade || !trade.payment) throw new Error("Trade or payment not found");
  if (trade.status !== TradeStatus.FAILED) {
    throw new Error(`Trade is in ${trade.status} state, expected FAILED`);
  }

  await refundPayment(trade.payment.whopPaymentId);

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: trade.payment!.id },
      data: { status: PaymentStatus.REFUNDED },
    });
    await tx.trade.update({
      where: { id: trade.id },
      data: { status: TradeStatus.REFUNDED },
    });
    if (trade.ask) {
      await tx.ask.update({
        where: { id: trade.ask.id },
        data: { status: "ACTIVE" },
      });
    }
    await tx.notification.createMany({
      data: [
        {
          userId: trade.buyerId,
          type: NotificationType.ITEM_FAILED,
          title: "Refund processed",
          message: `Your payment of $${trade.price.toFixed(2)} for ${trade.productSize.product.name} has been refunded.`,
          metadata: { tradeId: trade.id },
        },
        {
          userId: trade.sellerId,
          type: NotificationType.ITEM_FAILED,
          title: "Item relisted",
          message: `Your ask for ${trade.productSize.product.name} has been relisted after authentication failure.`,
          metadata: { tradeId: trade.id },
        },
      ],
    });
  });
}
```

> `initiatePayment` creates the Whop checkout and moves trade to `PAYMENT_PENDING`. `processRefund` refunds via Whop, reopens the seller's ask, and notifies both parties. ([Refund payment](https://docs.whop.com/api-reference/payments/refund-payment) | [Create transfer](https://docs.whop.com/api-reference/transfers/create-transfer))

## Escrow pattern — trade status state machine

Payment does **not** mean payout. Funds are held until authentication passes:

1. **MATCHED** — Bid matched an ask, trade created
2. **PAYMENT_PENDING** — Checkout created, waiting for buyer
3. **PAID** — Buyer charged, funds held via Whop
4. **SHIPPED** — Seller shipped item, provided tracking number
5. **AUTHENTICATING** — Platform received item, admin review in progress
6. **VERIFIED** — Item passes authentication, payout released to seller
7. **DELIVERED** — Item delivered to buyer
8. **FAILED** — Item fails authentication
9. **REFUNDED** — Buyer refunded, seller's ask reopened

On **VERIFIED**: payout goes to seller's connected account automatically (funds already linked via direct charge). On **FAILED**: buyer gets full refund, seller's ask can be reposted.

## Webhook handler — `src/app/api/webhooks/whop/route.ts`

Handles `payment.succeeded` and `payment.failed` events from Whop. ([Webhooks docs](https://docs.whop.com/developer/guides/webhooks))

```typescript
import { NextRequest } from "next/server";
import {
  PaymentStatus,
  TradeStatus,
  BidStatus,
  AskStatus,
  NotificationType,
} from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { whopsdk } from "@/lib/whop";
import { prisma } from "@/lib/prisma";
import { sendSystemMessage } from "@/services/chat";

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const headers = Object.fromEntries(request.headers);

    let webhookData: { type: string; data: Record<string, unknown> };
    try {
      webhookData = (await whopsdk.webhooks.unwrap(bodyText, {
        headers,
      })) as unknown as {
        type: string;
        data: Record<string, unknown>;
      };
    } catch {
      return new Response("Invalid webhook signature", { status: 401 });
    }

    waitUntil(processWebhook(webhookData));

    return new Response("OK", { status: 200 });
  } catch (error: unknown) {
    console.error("Webhook handler error:", error);
    return new Response("OK", { status: 200 });
  }
}

async function processWebhook(webhookData: {
  type: string;
  data: Record<string, unknown>;
}) {
  try {
    const paymentId = webhookData.data.id as string | undefined;
    if (!paymentId) return;

    // Idempotency check — skip if already processed
    const existingPayment = await prisma.payment.findFirst({
      where: { whopPaymentId: paymentId },
    });
    if (existingPayment) return;

    const tradeId = webhookData.data.metadata
      ? ((webhookData.data.metadata as Record<string, unknown>).tradeId as string | undefined)
      : undefined;

    switch (webhookData.type) {
      case "payment.succeeded": {
        if (!tradeId) return;

        const trade = await prisma.trade.findUnique({
          where: { id: tradeId },
        });
        if (!trade) return;

        await prisma.$transaction(async (tx) => {
          await tx.payment.create({
            data: {
              tradeId: trade.id,
              whopPaymentId: paymentId,
              amount: trade.price,
              platformFee: trade.platformFee,
              status: PaymentStatus.SUCCEEDED,
              idempotencyKey: `payment_succeeded_${paymentId}`,
            },
          });

          await tx.trade.update({
            where: { id: trade.id },
            data: { status: TradeStatus.PAID },
          });

          await tx.notification.createMany({
            data: [
              {
                userId: trade.buyerId,
                type: NotificationType.TRADE_COMPLETED,
                title: "Payment confirmed",
                message: `Your payment of $${trade.price.toFixed(2)} has been confirmed.`,
                metadata: { tradeId: trade.id },
              },
              {
                userId: trade.sellerId,
                type: NotificationType.ITEM_SHIPPED,
                title: "New sale - ship your item",
                message: `A buyer has paid $${trade.price.toFixed(2)}. Please ship your item for authentication.`,
                metadata: { tradeId: trade.id },
              },
            ],
          });
        });

        if (trade.chatChannelId) {
          await sendSystemMessage(
            trade.chatChannelId,
            "Payment confirmed! Seller, please ship your item for authentication."
          );
        }

        break;
      }

      case "payment.failed": {
        if (!tradeId) return;

        const trade = await prisma.trade.findUnique({
          where: { id: tradeId },
          include: { bid: true, ask: true },
        });
        if (!trade) return;

        await prisma.$transaction(async (tx) => {
          await tx.payment.create({
            data: {
              tradeId: trade.id,
              whopPaymentId: paymentId,
              amount: trade.price,
              platformFee: trade.platformFee,
              status: PaymentStatus.FAILED,
              idempotencyKey: `payment_failed_${paymentId}`,
            },
          });

          await tx.trade.update({
            where: { id: trade.id },
            data: { status: TradeStatus.FAILED },
          });

          if (trade.bid) {
            await tx.bid.update({
              where: { id: trade.bid.id },
              data: { status: BidStatus.ACTIVE },
            });
          }

          if (trade.ask) {
            await tx.ask.update({
              where: { id: trade.ask.id },
              data: { status: AskStatus.ACTIVE },
            });
          }

          await tx.notification.create({
            data: {
              userId: trade.buyerId,
              type: NotificationType.ITEM_FAILED,
              title: "Payment failed",
              message: "Your payment could not be processed. Your bid has been reopened.",
              metadata: { tradeId: trade.id },
            },
          });
        });

        if (trade.chatChannelId) {
          await sendSystemMessage(
            trade.chatChannelId,
            "Payment failed. The bid and ask have been reopened."
          );
        }

        break;
      }
    }
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
  }
}
```

**Key patterns:**
- **Signature verification first** — `whopsdk.webhooks.unwrap()` verifies the request came from Whop
- **Return 200 immediately** — process in background with `waitUntil` from `@vercel/functions`
- **Idempotency** — check if Payment with this `whopPaymentId` already exists before processing
- **Single transaction** — Payment record, trade status, and notifications all in one `$transaction`
- **Bid/ask reopening on failure** — failed payment reopens both orders for re-matching

**Required webhook permissions:** `payment:basic:read`, `plan:basic:read`, `access_pass:basic:read`, `member:email:read`, `member:basic:read`, `member:phone:read`, `promo_code:basic:read`, `webhook_receive:payments`

## Payment callback — `src/app/api/trades/[id]/payment-callback/route.ts`

Fallback for when webhooks don't arrive (common in sandbox). After the buyer completes Whop checkout, they're redirected here with `payment_id` and `checkout_status` query params.

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  PaymentStatus,
  TradeStatus,
  NotificationType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { getPaymentStatus } from "@/services/whop";
import { sendSystemMessage } from "@/services/chat";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tradeId } = await params;
  const paymentId = request.nextUrl.searchParams.get("payment_id");
  const checkoutStatus = request.nextUrl.searchParams.get("checkout_status");

  const dashboardUrl = `${env.NEXT_PUBLIC_APP_URL}/dashboard`;

  if (!tradeId || !paymentId) {
    return NextResponse.redirect(`${dashboardUrl}?payment=error`);
  }

  try {
    const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
    if (!trade) {
      return NextResponse.redirect(`${dashboardUrl}?payment=error`);
    }

    if (trade.status === TradeStatus.PAID) {
      return NextResponse.redirect(
        `${dashboardUrl}?payment=success&tradeId=${tradeId}`
      );
    }

    if (checkoutStatus !== "success") {
      return NextResponse.redirect(
        `${dashboardUrl}?payment=failed&tradeId=${tradeId}`
      );
    }

    const payment = await getPaymentStatus(paymentId);
    const whopPayment = payment as { status?: string; substatus?: string };
    const isPaid =
      whopPayment.status === "paid" || whopPayment.substatus === "succeeded";

    if (isPaid) {
      const existingPayment = await prisma.payment.findFirst({
        where: { whopPaymentId: paymentId },
      });

      if (!existingPayment) {
        await prisma.$transaction(async (tx) => {
          await tx.payment.create({
            data: {
              tradeId: trade.id,
              whopPaymentId: paymentId,
              amount: trade.price,
              platformFee: trade.platformFee,
              status: PaymentStatus.SUCCEEDED,
              idempotencyKey: `payment_callback_${paymentId}`,
            },
          });

          await tx.trade.update({
            where: { id: trade.id },
            data: { status: TradeStatus.PAID },
          });

          await tx.notification.createMany({
            data: [
              {
                userId: trade.buyerId,
                type: NotificationType.TRADE_COMPLETED,
                title: "Payment confirmed",
                message: `Your payment of $${trade.price.toFixed(2)} has been confirmed.`,
                metadata: { tradeId: trade.id },
              },
              {
                userId: trade.sellerId,
                type: NotificationType.ITEM_SHIPPED,
                title: "New sale - ship your item",
                message: `A buyer has paid $${trade.price.toFixed(2)}. Please ship your item for authentication.`,
                metadata: { tradeId: trade.id },
              },
            ],
          });
        });
      }

      if (trade.chatChannelId) {
        await sendSystemMessage(
          trade.chatChannelId,
          "Payment confirmed! Seller, please ship your item for authentication."
        );
      }

      return NextResponse.redirect(
        `${dashboardUrl}?payment=success&tradeId=${tradeId}`
      );
    }

    return NextResponse.redirect(
      `${dashboardUrl}?payment=pending&tradeId=${tradeId}`
    );
  } catch (error: unknown) {
    console.error("Payment callback error:", error);
    return NextResponse.redirect(
      `${dashboardUrl}?payment=error&tradeId=${tradeId}`
    );
  }
}
```

> Same idempotency check as the webhook handler — if both fire, only the first creates the Payment record. Whop payment `status` uses `paid`/`draft`/`open`, while `substatus` uses `succeeded`/`failed` — check both.

## Trade API route — `src/app/api/trades/[id]/route.ts`

Returns a single trade with all related data. Auth-gated: only the buyer or seller can view it.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const trade = await prisma.trade.findUnique({
      where: { id },
      include: {
        productSize: {
          include: {
            product: {
              select: { id: true, name: true, brand: true, images: true, sku: true },
            },
          },
        },
        buyer: { select: { id: true, username: true, displayName: true } },
        seller: { select: { id: true, username: true, displayName: true } },
        payment: true,
      },
    });

    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    if (trade.buyerId !== user.id && trade.sellerId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    return NextResponse.json({ trade });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("Failed to fetch trade:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## Real-time order book

Supabase Realtime broadcasts row changes on the `Bid` and `Ask` tables (enabled in Part 1 setup). A `useRealtimeBids(productSizeId)` hook at `src/hooks/useRealtimeBids.ts` subscribes to these changes using `@supabase/supabase-js` and re-fetches the order book on any insert/update. Bids sorted highest-first, asks lowest-first.

## Product pages

Each product has one canonical page at `/products/[id]`. The server component fetches the product with all sizes (including trade history) via Prisma, computes market summary stats (last sale, average price, total sales, premium/discount vs retail), and passes serialized data to a `ProductDetail` client component.

The page includes: product images, name/brand/SKU, size picker (each size is its own market), order book for selected size, price history chart (1D/7D/30D/90D/1Y/ALL timeframes), and bid/ask action buttons.

## Product authentication (admin flow)

After payment, the trade moves through SHIPPED > AUTHENTICATING > VERIFIED/FAILED. An admin panel at `/admin/authentication` lists trades in `AUTHENTICATING` status with approve/reject buttons. On rejection, admins must provide a reason. On VERIFIED, payout releases to seller. On FAILED, buyer gets refunded and seller's ask reopens (via `processRefund`).

## Dependencies for Part 2

```bash
npm install @supabase/supabase-js @vercel/functions
```

**Next**: Part 3 covers search, notifications, dashboards, embedded chat, and deployment.
