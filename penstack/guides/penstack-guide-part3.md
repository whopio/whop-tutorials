> **Part 3 of 3** - Payments & Polish: KYC, checkout, webhooks, explore page, notifications, demo mode, deployment
>
> Continues from [Part 2](./penstack-guide-part2.md) (Features). At this point you should have: complete data model, writer onboarding, Tiptap editor with paywall breaks, publication pages, article rendering, dashboard, like/follow functionality.

---

# Part 5: Payments, subscriptions, and KYC
Writers can publish articles and edit them, readers can interact with the articles, and subscribe to the writers. Now, let's take on one of the most important parts of our project - payments, subscriptions, and KYC.
Luckily for us, this will be quite easy since we'll be using the Whop Payments Network infrastructure for all three. Subscribers will pay the writers directly, the platform will take a 10% cut, and the entire flow will be handled without our project ever touching a credit card.
**Important note:** The `WHOP_API_KEY` must be a **company API key** from your company's Settings > API Keys page on Whop. Not the app API key from Developer > Apps. Both use the `apik_` prefix, so you can't tell them apart by looking at the key.
We'll use Whop's Direct Charge model where payments go directly to the writer's connected Whop account:
1. Subscriber pays the monthly subscription fee
2. Whop Payments Network processes the charge as a Direct Charge
3. Writer's connected account receives the 90% minus processing fees
4. Our platform gets 10% application fee
5. Whop fires a webhook and our project creates a Subscription record
Keep in mind that the 10% fee is defined in the `src/constants/config.ts` file:
```ts
export const PLATFORM_FEE_PERCENT = 10;
```
### Connected accounts and KYC
Before our writers can start posting paid articles and receive payments, they must verify their identity. We do this by prompting the writers to click the "Enable Paid Subscriptions" button which creates a Whop account for them and redirect the writer to a Whop hosted KYC page. This way we don't have to deal with storing and delivering any KYC information.
To do this, let's go to `src/app/api/writers/[id]/kyc` and create a file called `route.ts` with the content:
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { whop } from "@/lib/whop";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`kyc:${user.id}`, {
    interval: 60_000,
    maxRequests: 5,
  });
  if (limited) return limited;

  const writer = await prisma.writer.findUnique({
    where: { id },
    include: { user: { select: { email: true } } },
  });
  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }
  if (writer.userId !== user.id) {
    return NextResponse.json(
      { error: "Not your publication" },
      { status: 403 }
    );
  }

  if (writer.kycCompleted) {
    return NextResponse.json({ error: "KYC already completed" }, { status: 409 });
  }

  let companyId = writer.whopCompanyId;

  if (!companyId) {
    const company = await whop.companies.create({
      title: writer.name,
      parent_company_id: process.env.WHOP_COMPANY_ID!,
      email: writer.user.email,
    });

    companyId = company.id;

    await prisma.writer.update({
      where: { id },
      data: { whopCompanyId: companyId },
    });
  }

  const setupCheckout = await whop.checkoutConfigurations.create({
    company_id: companyId,
    mode: "setup",
    redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  });

  return NextResponse.json({ url: setupCheckout.purchase_url });
}
```
### Pricing and inline plan creation
After writers complete the KYC, they can set a subscription price. The setting route (in `src/app/api/writers/[id]/route.ts`) validates the price with Zod (minimum $1.00, maximum $1,000.00) and stores it as `monthlyPriceInCents` on the Writer record.
When a reader clicks the "Subscribe" button, the author's ID is directed to the checkout route and used to create a Whop checkout configuration, after which the reader is redirected to a hosted checkout URL. Once the payment is complete, a subscription record is created via webhook.
To do this, go to `src/app/api/checkout` and create a file called `route.ts` with the content:
```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { whop } from "@/lib/whop";
import { PLATFORM_FEE_PERCENT } from "@/constants/config";

const checkoutSchema = z.object({
  writerId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`checkout:${user.id}`, {
    interval: 60_000,
    maxRequests: 10,
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { writerId } = parsed.data;

  const writer = await prisma.writer.findUnique({ where: { id: writerId } });
  if (!writer) {
    return NextResponse.json({ error: "Writer not found" }, { status: 404 });
  }
  if (!writer.kycCompleted) {
    return NextResponse.json(
      { error: "Writer has not completed KYC" },
      { status: 400 }
    );
  }
  if (!writer.whopCompanyId) {
    return NextResponse.json(
      { error: "Writer does not have a connected account" },
      { status: 400 }
    );
  }

  const existingSub = await prisma.subscription.findUnique({
    where: { userId_writerId: { userId: user.id, writerId } },
  });
  if (existingSub && existingSub.status === "ACTIVE") {
    return NextResponse.json(
      { error: "You are already subscribed to this writer" },
      { status: 409 }
    );
  }

  const priceInCents = writer.monthlyPriceInCents ?? 0;
  const priceInDollars = priceInCents / 100;
  const applicationFee = Math.round(priceInCents * PLATFORM_FEE_PERCENT) / 10000;

  const checkout = await whop.checkoutConfigurations.create({
    plan: {
      company_id: writer.whopCompanyId,
      currency: "usd",
      renewal_price: priceInDollars,
      billing_period: 30,
      plan_type: "renewal",
      release_method: "buy_now",
      application_fee_amount: applicationFee,
      product: {
        external_identifier: `penstack-writer-${writer.id}`,
        title: `${writer.name} Subscription`,
      },
    },
    redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/${writer.handle}`,
    metadata: {
      userId: user.id,
      writerId: writer.id,
    },
  });

  return NextResponse.json({ url: checkout.purchase_url });
}
```
## Updating the SDK constructor

Before writing the webhook handler, update the `getWhop()` function in `src/lib/whop.ts` to include the webhook secret by adding `webhookKey` to the constructor:

```ts
_whop = new Whop({
  appID: process.env.WHOP_APP_ID!,
  apiKey: process.env.WHOP_API_KEY!,
  webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET!),
  ...(process.env.WHOP_SANDBOX === "true" && {
    baseURL: "https://sandbox-api.whop.com/api/v1",
  }),
});
```

Create the webhook on the company's Developer page (not the app's Webhooks tab).
### The webhook handler
The webhook handler is where payment state materializes in your database. If it's broken, payments succeed on Whop's side but your app never knows, subscribers pay but can't access content.
The handler must meet three requirements: **signature verification** (reject tampered payloads), **idempotency** (process each event exactly once), and **correct event routing** (map each event type to the right database update).
**Important note:** Event names use **dots** (`payment.succeeded`, `membership.activated`), not underscores.
Go to `src/app/api/webhooks/whop` and create a file called `route.ts` with the content:
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers);

  let webhookData: { type: string; data: Record<string, unknown>; id?: string };
  try {
    webhookData = (await whop.webhooks.unwrap(rawBody, { headers })) as unknown as {
      type: string;
      data: Record<string, unknown>;
      id?: string;
    };
  } catch (err) {
    console.error("Webhook unwrap error:", err);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  const eventId = webhookData.id ?? (webhookData.data.id as string);
  const event = webhookData.type;
  const data = webhookData.data;

  const existing = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });
  if (existing) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event) {
      case "payment.succeeded":
        await handlePaymentSucceeded(data);
        break;
      case "payment.failed":
        await handlePaymentFailed(data);
        break;
      case "membership.activated":
        await handleMembershipActivated(data);
        break;
      case "membership.deactivated":
        await handleMembershipDeactivated(data);
        break;
      default:
        break;
    }

    await prisma.webhookEvent.create({
      data: { id: eventId, eventType: event },
    });
  } catch (error) {
    console.error(`Webhook handler error for ${event}:`, error);
    return NextResponse.json(
      { error: "Internal webhook processing error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(data: Record<string, unknown>) {
  const membershipId = data.membership_id as string | undefined;
  if (!membershipId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { whopMembershipId: membershipId },
    include: { writer: true },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "ACTIVE" },
  });

  await prisma.notification.create({
    data: {
      userId: subscription.writer.userId,
      type: "PAYMENT_RECEIVED",
      title: "Payment received",
      message: "A subscriber payment was successfully processed.",
      writerId: subscription.writerId,
    },
  });
}

async function handlePaymentFailed(data: Record<string, unknown>) {
  const membershipId = data.membership_id as string | undefined;
  if (!membershipId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { whopMembershipId: membershipId },
    include: { writer: true },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "PAST_DUE" },
  });

  await prisma.notification.create({
    data: {
      userId: subscription.writer.userId,
      type: "PAYMENT_FAILED",
      title: "Payment failed",
      message: "A subscriber payment failed to process.",
      writerId: subscription.writerId,
    },
  });
}

async function handleMembershipActivated(data: Record<string, unknown>) {
  const membershipId = data.id as string;
  const userId = (data.metadata as Record<string, unknown>)?.userId as
    | string
    | undefined;
  const writerId = (data.metadata as Record<string, unknown>)?.writerId as
    | string
    | undefined;
  const currentPeriodEnd = data.current_period_end as string | undefined;

  if (!userId || !writerId) return;

  const subscription = await prisma.subscription.upsert({
    where: { userId_writerId: { userId, writerId } },
    update: {
      status: "ACTIVE",
      whopMembershipId: membershipId,
      currentPeriodEnd: currentPeriodEnd
        ? new Date(currentPeriodEnd)
        : undefined,
      cancelledAt: null,
    },
    create: {
      userId,
      writerId,
      status: "ACTIVE",
      whopMembershipId: membershipId,
      currentPeriodEnd: currentPeriodEnd
        ? new Date(currentPeriodEnd)
        : undefined,
    },
  });

  const writer = await prisma.writer.findUnique({ where: { id: writerId } });
  if (writer) {
    await prisma.notification.create({
      data: {
        userId: writer.userId,
        type: "NEW_SUBSCRIBER",
        title: "New subscriber",
        message: "Someone just subscribed to your publication!",
        writerId,
      },
    });
  }

  return subscription;
}

async function handleMembershipDeactivated(data: Record<string, unknown>) {
  const membershipId = data.id as string;

  const subscription = await prisma.subscription.findUnique({
    where: { whopMembershipId: membershipId },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });
}
```
## Subscription status checking

This function lives in the subscription service created in Part 4 (`src/services/subscription-service.ts`). It checks whether a user can access a writer's paid content, and runs on every paid post page load.

```ts
export async function canAccessPaidContent(
  userId: string,
  writerId: string
) {
  const sub = await prisma.subscription.findUnique({
    where: { userId_writerId: { userId, writerId } },
  });
  if (!sub) return false;
  if (sub.status !== "ACTIVE" && sub.status !== "CANCELLED") return false;

  if (sub.status === "CANCELLED" && sub.currentPeriodEnd) {
    return sub.currentPeriodEnd > new Date();
  }

  return sub.status === "ACTIVE";
}
```
Cancelled subscribers keep access until `currentPeriodEnd` passes. They've already paid for the current cycle, so we don't want to revoke access early.
## Checkpoint: first payment processed
Test the complete payment flow in the Whop sandbox (`WHOP_SANDBOX=true`):
1. Complete KYC in writer settings
2. Set a monthly price (like $5.00)
3. In an incognito window, log in as a different user and subscribe using a test card
4. Check application logs for webhook receipt and confirm a Subscription record exists with status `ACTIVE`
5. Publish a PAID post. The subscribed user sees full content, a non-subscriber sees the paywall
6. Cancel the subscription and verify access persists until `currentPeriodEnd`
In the next part, we add the features like explore, notification, and chat that directly affects engagement and churn.
# Part 6: Explore, notifications, and chat
In the project's current state, the only way for readers to find publications is if they know the link addresses, and this is a problem. We will solve this with a explore section on our homepage, set up a notification system to keep readers engaged, and add embedded chats that users can utilise in publication profiles.
The explore page will feature two distinct sections serving two different purposes. One will be a trending publications section (a list of authors with high engagement) and beneath it, a reverse chronological list of all publications' posts.
### The trending algorithm

The trending section ranks writers by a score computed from three signals:

```
score = followers * 1 + subscribers * 3 + recent_posts_14d * 2
```

Subscribers are weighted at 3x because a paid subscription is the strongest engagement signal. Recent posts carry 2x to ensure active writers surface above dormant ones. Followers sit at 1x as a baseline. The 14-day window for "recent posts" is defined in `src/constants/config.ts` as `TRENDING_WINDOW_DAYS`.
The new posts feed uses cursor-based pagination. When users click the "Load more" button, the client sends the post ID they see on the screen to the server, and the server sends the next batch.
Go to `src/services` and create a file called `explore-service.ts` with the content:

```ts
import { prisma } from "@/lib/prisma";
import {
  POSTS_PER_PAGE,
  TRENDING_WRITERS_COUNT,
  TRENDING_WINDOW_DAYS,
  TRENDING_WEIGHTS,
} from "@/constants/config";
import type { PublicationCategory } from "@/generated/prisma/client";

export async function getTrendingWriters(limit = TRENDING_WRITERS_COUNT) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - TRENDING_WINDOW_DAYS);

  const writers = await prisma.writer.findMany({
    include: {
      user: { select: { displayName: true, avatarUrl: true } },
      _count: { select: { followers: true, subscriptions: true } },
      posts: {
        where: { published: true, publishedAt: { gte: windowStart } },
        select: { id: true },
      },
    },
  });

  const scored = writers.map((writer) => {
    const score =
      writer._count.followers * TRENDING_WEIGHTS.followers +
      writer._count.subscriptions * TRENDING_WEIGHTS.subscribers +
      writer.posts.length * TRENDING_WEIGHTS.recentPosts;
    return { ...writer, trendingScore: score };
  });

  scored.sort((a, b) => b.trendingScore - a.trendingScore);
  return scored.slice(0, limit).map(({ posts, ...rest }) => rest);
}

export async function getRecentPosts(
  opts: { cursor?: string; limit?: number; category?: PublicationCategory } = {}
) {
  const { cursor, limit = POSTS_PER_PAGE, category } = opts;

  const posts = await prisma.post.findMany({
    where: {
      published: true,
      ...(category ? { writer: { category } } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      writer: {
        include: {
          user: { select: { displayName: true, avatarUrl: true } },
        },
      },
      _count: { select: { likes: true } },
    },
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { items, nextCursor };
}
```
The `PostFeed` client component (see `src/components/explore/post-feed.tsx` in the repo) manages cursor state and appends results on each "Load more" click. The server renders the first page; subsequent pages are fetched client-side. The button disappears when `nextCursor` is null.
### Category filtering
To deliver the articles that actually interest individual writers, we're going to include a category filter that updates the URL to `/?category=TECHNOLOGY`, making filtered views shareable. Using URL params instead of component state means the server re-renders with filtered data on each navigation, and users can share filtered links directly.
Go to `src/components/explore` and create a file called `category-filter.tsx` with the content:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PublicationCategory } from "@/generated/prisma/browser";
import { CATEGORY_LABELS } from "@/constants/categories";

export function CategoryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category");

  function handleSelect(category: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      <button
        onClick={() => handleSelect(null)}
        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
          !active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
        }`}
      >
        All
      </button>
      {Object.values(PublicationCategory).map((cat) => (
        <button
          key={cat}
          onClick={() => handleSelect(cat)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
            active === cat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}
```
### Notification system
Our project has five notification types: new post, new subscriber, new follower, and payment received/failed. To create this service, go to `src/services` and create a file called `notification-service.ts` with the content:
```ts
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/client";

export async function notifyFollowers(
  writerId: string,
  type: NotificationType,
  title: string,
  message: string,
  refs?: { postId?: string; writerId?: string }
) {
  const followers = await prisma.follow.findMany({
    where: { writerId },
    select: { userId: true },
  });
  if (followers.length === 0) return;

  await prisma.notification.createMany({
    data: followers.map((f) => ({
      userId: f.userId,
      type,
      title,
      message,
      postId: refs?.postId,
      writerId: refs?.writerId,
    })),
  });
}
```
### Embedded Whop chat
Live chats are one of the biggest engagement drivers in these types of projects, and it allows writers to form a community much more easily.
Rather than building WebSocket infrastructure, message storage, moderation, and presence indicators, we embed Whop's chat components directly.

The chat needs an access token, so we create a rate-limited endpoint that returns the user's Whop OAuth token.

Go to `src/app/api/token` and create a file called `route.ts` with the content:

```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`token:${session.userId}`, {
    interval: 60_000,
    maxRequests: 30,
  });
  if (limited) return limited;

  return NextResponse.json({ accessToken: session.accessToken ?? null });
}
```
Then, go to `src/components/chat` and create a file called `writer-chat.tsx` with the content:

```tsx
"use client";

import { useEffect, useState, type CSSProperties, type FC, type ReactNode } from "react";
import { Elements } from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";

let ChatElement: FC<{ options: { channelId: string }; style?: CSSProperties }> | undefined;
let ChatSession: FC<{ token: () => Promise<string>; children: ReactNode }> | undefined;

try {
  const mod = require("@whop/embedded-components-react-js");
  ChatElement = mod.ChatElement;
  ChatSession = mod.ChatSession;
} catch {
}

interface WriterChatProps {
  channelId: string;
  className?: string;
}

async function getToken(): Promise<string> {
  const res = await fetch("/api/token");
  const data = await res.json();
  return data.accessToken;
}

export function WriterChat({ channelId, className }: WriterChatProps) {
  const [elements, setElements] =
    useState<Awaited<ReturnType<typeof loadWhopElements>>>(null);

  useEffect(() => {
    loadWhopElements().then(setElements);
  }, []);

  if (!elements || !ChatElement || !ChatSession) {
    return (
      <div className={className}>
        <div className="flex h-[500px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500">
          <p>Chat is loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Elements elements={elements}>
      <ChatSession token={getToken}>
        <div className={className}>
          <ChatElement
            options={{ channelId }}
            style={{ height: "500px", width: "100%", borderRadius: "12px", overflow: "hidden" }}
          />
        </div>
      </ChatSession>
    </Elements>
  );
}
```

For TypeScript to accept these imports, we need a type augmentation.

Go to `src/types` and create a file called `whop-chat.d.ts` with the content:

```ts
import type { CSSProperties, FC, ReactNode } from "react";

declare module "@whop/embedded-components-react-js" {
  export interface ChatElementOptions {
    channelId: string;
    deeplinkToPostId?: string;
    onEvent?: (event: { type: string; detail: Record<string, unknown> }) => void;
  }

  export const ChatElement: FC<{ options: ChatElementOptions; style?: CSSProperties }>;
  export const ChatSession: FC<{ token: () => Promise<string>; children: ReactNode }>;
}
```

The `channelId` comes from the writer's `whopChatChannelId` field. The `chatPublic` boolean controls access: when false, only subscribers see the chat section on the writer's profile page.
### The writer analytics dashboard
Since writers in our project can receive payments and actually run a platform of their own, we need to provide them with information about their performance. The dashboard (see `src/app/dashboard/page.tsx` in the repo) shows four stat cards: subscribers, followers, total views, total posts - followed by a table of all posts with status, visibility, view count, and like count.
Add the following function to `src/services/writer-service.ts`:

```ts
export async function getWriterStats(writerId: string) {
  const [subscriberCount, followerCount, totalViews, postCount] =
    await Promise.all([
      prisma.subscription.count({ where: { writerId, status: "ACTIVE" } }),
      prisma.follow.count({ where: { writerId } }),
      prisma.post.aggregate({
        where: { writerId, published: true },
        _sum: { viewCount: true },
      }),
      prisma.post.count({ where: { writerId, published: true } }),
    ]);

  return {
    subscribers: subscriberCount,
    followers: followerCount,
    totalViews: totalViews._sum.viewCount ?? 0,
    totalPosts: postCount,
  };
}
```
# Part 7: Demo mode, polish, and production readiness
Our platform is now almost entirely ready. Authors can share content, readers can subscribe, payments are processed via Direct Charge, and notifications inform all users of important actions. There are a few things you need to pay attention to before completing the project.
### Demo mode and hybrid checkout
The subscribe button uses a hybrid approach. Writers who have completed KYC and have a connected Whop account (`whopCompanyId` + `kycCompleted`) get a real Whop sandbox checkout — readers are redirected to a hosted checkout page, and a subscription record is created via webhook after payment. Since we're already using Whop Sandbox keys throughout this tutorial, no real money is involved.

For seeded demo writers (created by the seed script, without a connected Whop account), the subscribe button shows a `DemoModal` that explains the writer hasn't completed payment setup. Clicking "Confirm subscription" creates a mock subscription via `/api/demo/subscribe` without touching the payment network.

The `SubscribeButton` component receives a `hasCheckout` prop from the server:

```tsx
hasCheckout={!!writer.whopCompanyId && !!writer.kycCompleted}
```

When `hasCheckout` is true, it calls `/api/checkout` (real Whop checkout). When false, it opens the demo modal. This way the demo infrastructure (`src/lib/demo.ts`, `src/components/demo/`, `src/app/api/demo/`, `prisma/seed.ts`) is only used as a fallback for writers without payment setup.
### Rate limiting reference

Nearly every API route uses the in-memory rate limiter we built in Part 1. The webhook endpoint is excluded since Whop controls call frequency.
```
<table>
<tr><th>Route</th><th>Key pattern</th><th>Max requests</th><th>Window</th></tr>
<tr><td><code>GET /api/auth/login</code></td><td><code>auth:login</code> (global)</td><td>10</td><td>60s</td></tr>
<tr><td><code>GET /api/posts</code></td><td><code>posts:list</code> (global)</td><td>60</td><td>60s</td></tr>
<tr><td><code>POST /api/posts</code></td><td><code>posts:create:{userId}</code></td><td>10</td><td>60s</td></tr>
<tr><td><code>POST /api/posts/[id]/like</code></td><td><code>like:{userId}</code></td><td>30</td><td>60s</td></tr>
<tr><td><code>POST /api/writers</code></td><td><code>writers:create:{userId}</code></td><td>5</td><td>60s</td></tr>
<tr><td><code>PATCH /api/writers/[id]</code></td><td><code>writer:update:{userId}</code></td><td>20</td><td>60s</td></tr>
<tr><td><code>POST /api/writers/[id]/kyc</code></td><td><code>kyc:{userId}</code></td><td>5</td><td>60s</td></tr>
<tr><td><code>POST /api/checkout</code></td><td><code>checkout:{userId}</code></td><td>10</td><td>60s</td></tr>
<tr><td><code>POST /api/follow</code></td><td><code>follow:{userId}</code></td><td>30</td><td>60s</td></tr>
<tr><td><code>GET /api/notifications</code></td><td><code>notifications:{userId}</code></td><td>30</td><td>60s</td></tr>
<tr><td><code>GET /api/token</code></td><td><code>token:{userId}</code></td><td>30</td><td>60s</td></tr>
<tr><td><code>POST /api/demo/subscribe</code></td><td><code>demo:subscribe:{userId}</code></td><td>10</td><td>60s</td></tr>
</table>
```
### Security and performance
Our session cookies are set to `SameSite: Lax`. This prevents malicious websites from sending requests to our site on behalf of users who have logged into our project. Additionally, because Tiptap stores shares as JSON rather than HTML and we use the `escapeHtml` function, malicious users cannot use scripts as share content.
All routes that write or read user data use `requireAuth()`. The only exceptions are the public feed (`/api/posts`), public profiles (`/api/writers/[id]`), and the webhook endpoint (which verifies Whop's signature instead).
For the sake of performance, we use the Next.js' `Image` component for all uploaded images to get automatic format conversion, resizing, and lazy loading. The Tiptap editor is also dynamically imported so users never download the editor code:

```ts
const Editor = dynamic(() => import("@/components/editor/post-editor"), { ssr: false });
```
### Switching from sandbox to live Whop keys
Throughout this tutorial we've used the Whop sandbox keys (from sandbox.whop.com) so we could test payments without moving real money. To go live, you need to get new keys from Whop.com:
1. Go to whop.com, open your whop's dashboard, and navigate to the Developer page
2. Create a new app (or use an existing one) and grab the App ID, API Key, Company ID, Client ID, and Client Secret
3. Set the OAuth redirect URL to your production domain: `https://your-app.vercel.app/api/auth/callback`
4. Create a company-level webhook pointing to `https://your-app.vercel.app/api/webhooks/whop` and copy the new webhook secret
5. Update your Vercel environment variables with the live keys (`WHOP_APP_ID`, `WHOP_API_KEY`, `WHOP_COMPANY_ID`, `WHOP_WEBHOOK_SECRET`, `WHOP_CLIENT_ID`, `WHOP_CLIENT_SECRET`)
6. Remove `WHOP_SANDBOX=true` from your environment variables (or leave it unset)
Once the sandbox variable is gone, the `src/lib/whop.ts` SDK client automatically points to the live Whop API and OAuth endpoints instead of the sandbox ones.
### Deployment checklist

#### Production

1. All environment variables set in Vercel: `WHOP_APP_ID`, `WHOP_API_KEY`, `WHOP_COMPANY_ID`, `WHOP_WEBHOOK_SECRET`, `WHOP_CLIENT_ID`, `WHOP_CLIENT_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `UPLOADTHING_TOKEN`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`
2. Schema pushed: `npx prisma db push`
3. Webhook URL configured in Whop: `https://your-app.vercel.app/api/webhooks/whop`
4. OAuth redirect URL in Whop: `https://your-app.vercel.app/api/auth/callback`
5. Uploadthing callback URL configured for production domain

#### Demo (optional)

1. Create a second Vercel project from the same repository
2. Configure a separate Supabase database (never share the production database)
3. Push schema and run seed: `npx prisma db push && npm run db:seed`
4. Seeded writers use the demo subscribe fallback; real writers who complete KYC get sandbox checkout

### Verification

Before calling the platform complete:

- Rate limiting rejects excessive requests (429 response)
- Subscribe buttons redirect to Whop checkout for KYC'd writers, or show demo modal for seeded writers
- The webhook handler creates subscription records after successful payments
- All environment variables are set and the build succeeds on Vercel
## What we've built and what's next
Over seven parts, we built a functional Substack clone where:
- Users can become writers and create publications
- Post preview, paid, or free articles
- Readers can follow and subscribe to writers
- Preview and paid articles are kept safe from unsubscribed readers
- Readers can leave likes on articles
- Publication profiles have embedded Whop chats
The full source code is available at [github.com/whopio/whop-tutorials/tree/main/penstack](https://github.com/whopio/whop-tutorials/tree/main/penstack). The live demo is running at [penstack-fresh.vercel.app](https://penstack-fresh.vercel.app/).
## Build your own platform with Whop Payments Network
In this project, we used Whop Payments Network, the Whop API, and the Whop infrastructure to easily solve some of the most challenging parts of building a fully functional project that can actually move money and offer a safe experience to the users.
This Substack clone is one of the many platform examples you can build with Whop. You can check out our other build with Whop guides in our tutorials category and learn more about the entire Whop infrastructure in our developer documentation.
BUTTON HERE