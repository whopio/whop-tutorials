# Swaphause (StockX clone) Guide — Part 3: Search, Chat & Deployment

This part covers search, notifications, user dashboards, embedded buyer-seller chat via Whop, and production deployment. Assumes Parts 1-2 are complete.

## Search and filtering

PostgreSQL full-text search via Prisma — no external search service needed. The search indexes product name, brand, and SKU.

**SearchBar component** (`src/components/SearchBar.tsx`):
- Debounced input (300ms) calling `onChange` with current filters
- Dropdowns for category, brand, size; min/max price fields
- Removable filter pills for active filters
- `CATEGORIES` from `src/constants/index.ts` populates the category dropdown
- Brand and size options passed as props from the parent page

**Filter system:**
- URL-persisted state: `?category=sneakers&brand=nike&minPrice=100`
- All filters combinable, result count updates live
- Clear all button, responsive sidebar (desktop) / bottom sheet (mobile)

**Trending algorithm:**
- Score = `(trades_24h * 3) + (bids_24h * 1) + (abs(price_change_pct) * 2)`
- Top 8-12 products shown on homepage
- Recalculate periodically (cron or cached on-demand)

**Pagination** (`src/components/Pagination.tsx`):
- Takes `currentPage`, `totalPages`, `onPageChange`
- First/prev/next/last buttons, page numbers with ellipsis for large ranges
- URL-persisted: `?page=3`, preserves filters across pages
- Returns null when totalPages <= 1

## Notifications

In-app notification feed using the `Notification` model from Part 1. No external service.

**Notification triggers** (created within matching engine and webhook handler transactions):
- Bid matched, ask matched, payment confirmed, payment failed
- Item shipped, authentication complete, authentication failed
- Price alert (future enhancement)

**NotificationBell component** (`src/components/NotificationBell.tsx`):
- Bell icon with unread count badge in navbar
- Dropdown listing recent notifications grouped by read/unread
- Click marks as read and navigates to `/trades/{tradeId}` if metadata contains `tradeId`
- "Mark all as read" button

**useNotifications hook** (`src/hooks/useNotifications.ts`):
- Fetches from `/api/notifications`
- Subscribes to Supabase Realtime on `Notification` table filtered by userId
- Exposes `markAsRead`, `markAllAsRead`, `unreadCount`

## User dashboard

Client component at `src/app/dashboard/page.tsx` with four tabs:

- **Overview** — summary cards (active bids/asks, completed trades, earnings)
- **Buying** — active bids table, purchase history
- **Selling** — gated behind seller onboarding (checks `connectedAccountId` via `useCurrentUser` from Part 2). If not onboarded: "Become a Seller" button triggers `POST /api/sellers/onboard`. If onboarded: active asks, sales history, items to ship
- **Portfolio** — each owned item with purchase price, current market price, gain/loss %

Uses a `usePortfolio` hook (`src/hooks/usePortfolio.ts`) that fetches from `/api/user/portfolio`.

## Buyer-seller chat with Whop embedded components

Whop provides pre-built chat UI with real-time messaging, DM channels, and short-lived access tokens — no chat infrastructure to build. ([Chat quickstart](https://docs.whop.com/developer/guides/chat/quickstart) | [Chat element](https://docs.whop.com/developer/guides/chat/chat-element))

### Chat permissions

Your company API key needs these permissions (Settings > API Keys):
- `chat:read` — Read chat messages
- `chat:message:create` — Send system messages
- `dms:read` — List/retrieve DM channels
- `dms:message:manage` — Manage DM messages
- `dms:channel:manage` — Create/manage DM channels

### Install packages

```bash
npm install @whop/embedded-components-react-js@0.0.13-beta.4 @whop/embedded-components-vanilla-js@0.0.13-beta.4
```

> Chat components are in the `0.0.13-beta` release. Stable `0.0.12` only has payouts components.

### Chat service — `src/services/chat.ts`

Three functions calling Whop API directly (these endpoints aren't in `@whop/sdk@0.0.27`). ([Create access token](https://docs.whop.com/api-reference/access-tokens/create-access-token) | [Create DM channel](https://docs.whop.com/api-reference/dm-channels/create-dm-channel) | [Chat authentication](https://docs.whop.com/developer/guides/chat/authentication))

```typescript
import { env } from "@/lib/env";

export async function createAccessToken(oauthToken: string): Promise<string> {
  const res = await fetch(`${env.WHOP_API_BASE}/api/v1/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create access token: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { token: string };
  return data.token;
}

export async function createDmChannel(
  buyerWhopId: string,
  sellerWhopId: string,
  tradeName: string
): Promise<string> {
  const res = await fetch(`${env.WHOP_API_BASE}/api/v1/dm_channels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHOP_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      with_user_ids: [buyerWhopId, sellerWhopId],
      company_id: env.WHOP_COMPANY_ID,
      custom_name: tradeName,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create DM channel: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function sendSystemMessage(
  channelId: string,
  content: string
): Promise<void> {
  const res = await fetch(`${env.WHOP_API_BASE}/api/v1/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHOP_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel_id: channelId, content }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to send system message: ${res.status} ${text}`);
  }
}
```

### Token endpoint — `src/app/api/token/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAccessToken } from "@/services/chat";

export async function GET() {
  try {
    const session = await getSession();

    if (!session.accessToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = await createAccessToken(session.accessToken);
    return NextResponse.json({ token });
  } catch (error: unknown) {
    console.error("Token creation error:", error);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}
```

### TradeChat component — `src/components/TradeChat.tsx`

```tsx
"use client";

import { useMemo } from "react";
import {
  ChatElement,
  ChatSession,
  Elements,
} from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import type { ChatElementOptions } from "@whop/embedded-components-vanilla-js/types";

const whopEnvironment =
  (process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT as "sandbox" | "production") ||
  "production";

const elements = loadWhopElements({ environment: whopEnvironment });

async function getToken({ abortSignal }: { abortSignal: AbortSignal }) {
  const response = await fetch("/api/token", { signal: abortSignal });
  const data = await response.json();
  return data.token;
}

interface TradeChatProps {
  channelId: string | null;
}

export function TradeChat({ channelId }: TradeChatProps) {
  const chatOptions: ChatElementOptions = useMemo(() => {
    return { channelId: channelId ?? "" };
  }, [channelId]);

  if (!channelId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Chat will be available once the trade is matched.
      </div>
    );
  }

  return (
    <Elements elements={elements}>
      <ChatSession token={getToken}>
        <ChatElement
          options={chatOptions}
          style={{ height: "500px", width: "100%" }}
        />
      </ChatSession>
    </Elements>
  );
}
```

**How it integrates:**
- `loadWhopElements({ environment })` runs once at module level — uses `NEXT_PUBLIC_WHOP_ENVIRONMENT`
- `getToken` fetches from `/api/token`. `ChatSession` calls it automatically and refreshes before expiry
- `Elements` provides the Whop runtime context, `ChatSession` manages auth, `ChatElement` renders the chat UI

### Chat integration points (already built in Parts 2-3)

- **Matching engine** (`setupTradeChat`): auto-creates DM channel on trade match, sends initial system message
- **Webhook handler + payment callback**: send system messages on payment success/failure
- **Trade detail page** (`/trades/[id]`): responsive grid — trade details on left, `TradeChat` on right (stacked on mobile). Only shown to trade participants
- **Navbar**: chat bubble icon linking to dashboard

## Deployment checklist

**Environment variables:**
- Production: `WHOP_API_BASE=https://api.whop.com`, keys from `whop.com/dashboard/developer`
- Preview/dev: `WHOP_API_BASE=https://sandbox-api.whop.com`, keys from `sandbox.whop.com/dashboard/developer`
- `WHOP_API_KEY` is a **company API key** (not app key) in all environments
- `WHOP_COMPANY_ID` is set correctly (`biz_...` from company dashboard URL)
- No secrets in `NEXT_PUBLIC_` variables
- `NEXT_PUBLIC_WHOP_ENVIRONMENT` set to `production` for prod, `sandbox` for dev/preview

**Security:**
- Webhook signature verification active (via `whopsdk.webhooks.unwrap()`)
- Rate limiting on all API routes
- Zod validation on all API route inputs
- CORS and CSRF configured
- Input sanitized for storage and render

**Whop dashboard:**
- OAuth redirect URI updated to production URL
- Webhook endpoint URL set to `https://yourdomain.com/api/webhooks/whop`
- All 8 webhook permissions enabled: `payment:basic:read`, `plan:basic:read`, `access_pass:basic:read`, `member:email:read`, `member:basic:read`, `member:phone:read`, `promo_code:basic:read`, `webhook_receive:payments`
- All 5 chat permissions enabled: `chat:read`, `chat:message:create`, `dms:read`, `dms:message:manage`, `dms:channel:manage`

**Database:**
- Supabase Realtime enabled on `Bid` and `Ask` tables
- `connection_limit=1` on DATABASE_URL for Vercel serverless

## Future enhancements

- Different product categories (sneakers, trading cards, electronics, vintage clothing)
- Analytics dashboard (trade volume, most-traded products, price trends, platform revenue)
- Mobile app (API routes are already RESTful)
- Seller ratings (authentication pass rates, trust scores)
- Price alerts via email/SMS (extend the notification system)

---

Built with [Whop](https://whop.com) — [docs.whop.com](https://docs.whop.com)
