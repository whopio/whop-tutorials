# ChatForge: AI Chatbot SaaS — Part 2: Features

> This is file 2 of 2. Requires file 1 (Foundation) for architecture, schema, auth, and data models. This file covers the chat interface, payments, custom bot builder, and production deploy.

---

> Files modified: `src/lib/env.ts`, `src/app/page.tsx`

## AI Provider Keys

Add `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` to Vercel:

```bash
vercel env add ANTHROPIC_API_KEY
vercel env add OPENAI_API_KEY
vercel env pull .env.local
```

Update `src/lib/env.ts` to add both keys to the Zod schema (see file 1 (Foundation) for the final `env.ts`).

## AI Model Resolver

Single source of truth for all model options — used in route.ts, admin forms, user bot forms, and Zod validation.

```ts
// src/lib/ai.ts
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export const SUPPORTED_MODELS = [
  {
    id: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    provider: "anthropic" as const,
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "openai" as const,
  },
] as const;

export type SupportedModelId = (typeof SUPPORTED_MODELS)[number]["id"];

const DEFAULT_MODEL: SupportedModelId = "claude-haiku-4-5-20251001";

export function getModel(modelId?: string | null): LanguageModel {
  const id = modelId || DEFAULT_MODEL;
  const entry = SUPPORTED_MODELS.find((m) => m.id === id);
  if (!entry) {
    return anthropic(DEFAULT_MODEL);
  }
  switch (entry.provider) {
    case "anthropic":
      return anthropic(entry.id);
    case "openai":
      return openai(entry.id);
  }
}
```

Adding a new provider (e.g., Google Gemini) is `npm install @ai-sdk/google` + one entry in `SUPPORTED_MODELS`.

## Plan Enforcement

```ts
// src/lib/membership.ts
import { prisma } from "./prisma";

type UserPlan = {
  id: string;
  name: string;
  price: number;
  checkoutUrl: string;
  allowCustomBots: boolean;
};

export async function getUserPlan(userId: string): Promise<UserPlan | null> {
  const membership = await prisma.membership.findUnique({
    where: { userId },
    include: { plan: true },
  });

  if (!membership || membership.status !== "ACTIVE" || !membership.plan) {
    return null;
  }

  return {
    id: membership.plan.id,
    name: membership.plan.name,
    price: membership.plan.price,
    checkoutUrl: membership.plan.checkoutUrl,
    allowCustomBots: membership.plan.allowCustomBots,
  };
}

export function canAccessBot(
  bot: { planId: string | null; type?: string; createdById?: string | null; plan?: { price: number } | null },
  userPlan: { price: number } | null,
  currentUserId?: string
): boolean {
  if (bot.type === "MODEL") {
    return !!userPlan; // any paid plan unlocks MODEL bots
  }
  if (bot.type === "USER") {
    return !!currentUserId && bot.createdById === currentUserId; // private to creator
  }
  if (!bot.planId) return true; // free bot
  if (!userPlan) return false; // free user, paid bot
  return userPlan.price >= (bot.plan?.price ?? 0); // price-based access
}

// Configurable — adjust these for your business model
export const USER_BOT_LIMIT = 2;
export const MAX_KNOWLEDGE_LENGTH = 50_000;

const FREE_DAILY_LIMIT = 20;
const PAID_DAILY_LIMIT = 50;
const FREE_CONVERSATION_LIMIT = 10;

export async function getMessageCountToday(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.message.count({
    where: {
      conversation: { userId },
      role: "USER",
      createdAt: { gte: startOfDay },
    },
  });
}

export function isOverMessageLimit(
  count: number,
  userPlan: { price: number } | null
): boolean {
  const limit = userPlan ? PAID_DAILY_LIMIT : FREE_DAILY_LIMIT;
  return count >= limit;
}

export function getConversationLimit(
  userPlan: { price: number } | null
): number | undefined {
  return userPlan ? undefined : FREE_CONVERSATION_LIMIT;
}
```

## Chat API Route

Orchestrates: auth → bot lookup → access check → message limit → conversation create/find → stream LLM response → persist messages on finish.

```ts
// src/app/api/chat/route.ts
import { convertToModelMessages, streamText } from "ai";
import { getModel } from "@/lib/ai";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserPlan,
  canAccessBot,
  getMessageCountToday,
  isOverMessageLimit,
} from "@/lib/membership";

export async function POST(req: Request) {
  const user = await requireAuth({ redirect: false });
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const { messages, botId, conversationId } = body;

  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    include: { plan: { select: { price: true } } },
  });
  if (!bot) return new Response("Bot not found", { status: 404 });

  const userPlan = await getUserPlan(user.id);

  if (!canAccessBot(bot, userPlan, user.id)) {
    return new Response("Upgrade required to access this bot", { status: 403 });
  }

  const count = await getMessageCountToday(user.id);
  if (isOverMessageLimit(count, userPlan)) {
    return new Response("Daily message limit reached", { status: 429 });
  }

  const lastMessage = messages[messages.length - 1];
  const lastUserText =
    lastMessage?.parts
      ?.filter((p: { type: string }) => p.type === "text")
      .map((p: { text: string }) => p.text)
      .join("") ||
    lastMessage?.content ||
    "New chat";

  let activeConversationId = conversationId as string | undefined;
  if (!activeConversationId) {
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        botId: bot.id,
        title: lastUserText.slice(0, 50),
      },
    });
    activeConversationId = conversation.id;
  }

  let systemPrompt = bot.systemPrompt;
  if (bot.knowledge) {
    systemPrompt += `\n\nReference knowledge:\n${bot.knowledge}`;
  }

  const recentMessages = messages.slice(-20); // keep token usage low
  const modelMessages = await convertToModelMessages(recentMessages);

  const result = streamText({
    model: getModel(bot.model),
    maxRetries: 1,
    maxOutputTokens: 1024,
    system: systemPrompt,
    messages: modelMessages,
    onFinish: async ({ text, usage }) => {
      await prisma.message.createMany({
        data: [
          {
            conversationId: activeConversationId!,
            role: "USER",
            content: lastUserText,
            tokenCount: usage?.inputTokens || 0,
          },
          {
            conversationId: activeConversationId!,
            role: "ASSISTANT",
            content: text,
            tokenCount: usage?.outputTokens || 0,
          },
        ],
      });

      await prisma.conversation.update({
        where: { id: activeConversationId },
        data: { updatedAt: new Date() },
      });
    },
  });

  const limit = userPlan ? 50 : 20;
  const remaining = Math.max(0, limit - count - 1);

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Conversation-Id": activeConversationId!,
      "X-Messages-Remaining": String(remaining),
    },
  });
}
```

## Chat Layout

Server component that fetches all data needed by the sidebar and chat area. Handles both authenticated and unauthenticated users (Part 6 adds unauth browsing).

```ts
// src/app/chat/layout.tsx
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getUserPlan, getConversationLimit } from "@/lib/membership";
import { Sidebar } from "./_components/sidebar";
import { ChatShell } from "./_components/chat-shell";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth({ redirect: false });

  let userPlan: Awaited<ReturnType<typeof getUserPlan>> = null;
  let admin = false;
  let conversations: {
    id: string;
    title: string | null;
    updatedAt: string;
    bot: { name: string };
  }[] = [];
  let plans: {
    name: string;
    price: number;
    checkoutUrl: string;
    allowCustomBots: boolean;
    whopPlanId: string;
  }[] = [];

  if (user) {
    [userPlan, admin] = await Promise.all([
      getUserPlan(user.id),
      isAdmin(),
    ]);

    const limit = getConversationLimit(userPlan);

    const [rawConversations, rawPlans] = await Promise.all([
      prisma.conversation.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: limit, // 10 for free, unlimited for paid
        select: {
          id: true,
          title: true,
          updatedAt: true,
          bot: { select: { name: true } },
        },
      }),
      !userPlan
        ? prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { price: "asc" },
            select: { name: true, price: true, checkoutUrl: true, allowCustomBots: true, whopPlanId: true },
          })
        : [],
    ]);

    conversations = rawConversations.map((c) => ({
      ...c,
      updatedAt: c.updatedAt.toISOString(),
    }));
    plans = rawPlans;
  } else {
    plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
      select: { name: true, price: true, checkoutUrl: true, allowCustomBots: true, whopPlanId: true },
    });
  }

  return (
    <ChatShell
      sidebar={
        <Sidebar
          conversations={conversations}
          user={user ? { name: user.name, avatarUrl: user.avatarUrl } : null}
          userPlan={userPlan ? { name: userPlan.name, price: userPlan.price, allowCustomBots: userPlan.allowCustomBots } : null}
          isAdmin={admin}
          plans={plans}
          isAuthenticated={!!user}
        />
      }
    >
      {children}
    </ChatShell>
  );
}
```

## ChatShell (Mobile Sidebar Context)

Build `src/app/chat/_components/chat-shell.tsx` — client component that wraps the chat layout and provides a React context for mobile sidebar toggle:

```ts
"use client";

import { createContext, useContext, useState } from "react";

const SidebarToggleContext = createContext<() => void>(() => {});
export const useSidebarToggle = () => useContext(SidebarToggleContext);
```

The component renders the sidebar (passed as prop) alongside children. On mobile, manages `isOpen` state — sidebar is hidden off-screen by default, `useSidebarToggle()` toggles it visible. Desktop: sidebar always visible. See Part 6 for the full CSS approach.

## Sidebar

Build `src/app/chat/_components/sidebar.tsx` — client component:

- **Conversation list**: Links to `/chat/[id]`, active state highlighting, shows conversation title or bot name fallback
- **"New chat" button** at the top linking to `/chat`
- **Settings popover** at bottom: user avatar + name button opens a popover (outside-click dismissal via `useRef` + `useEffect`). Shows:
  - Plan badge (plan name or "Free")
  - Upgrade CTA if free user (links to cheapest plan's `checkoutUrl`)
  - "My Bots" link if `userPlan?.allowCustomBots` (added in Part 5)
  - "Manage bots" / "Manage plans" links if admin
  - Sign out button
- **Unauthenticated state** (Part 6): shows "Sign in with Whop" button instead of settings popover
- **Plans modal** (Part 6): free users can browse available plans
- **Conversation management** (Part 6): rename (inline edit) and delete (two-click confirmation)

## Chat Area

Build `src/app/chat/_components/chat-area.tsx` — client component. This is the main chat UI. Key patterns:

### Key Imports

```ts
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
```

### DB to UI Message Conversion

The AI SDK expects messages in a specific format with `parts` arrays. Convert database messages:

```ts
type DBMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
};

function dbToUIMessages(msgs: DBMessage[]) {
  return msgs.map((m) => ({
    id: m.id,
    role: m.role.toLowerCase() as "user" | "assistant",
    parts: [{ type: "text" as const, text: m.content }],
  }));
}
```

### useChat + Custom Fetch Transport

The Vercel AI SDK's `useChat` hook handles streaming. We intercept the fetch to capture custom response headers (`X-Conversation-Id` for URL sync, `X-Messages-Remaining` for limit display):

```ts
// Key pattern inside ChatArea component:
const conversationIdRef = useRef(conversationId);
conversationIdRef.current = conversationId;

const customFetch: typeof globalThis.fetch = async (input, init) => {
  const response = await globalThis.fetch(input, init);
  const newId = response.headers.get("X-Conversation-Id");
  if (newId && !conversationIdRef.current) {
    setConversationId(newId);
    window.history.replaceState(null, "", `/chat/${newId}`);
  }
  const remaining = response.headers.get("X-Messages-Remaining");
  if (remaining !== null) {
    setMessagesRemaining(parseInt(remaining, 10));
  }
  return response;
};

const transport = useMemo(
  () => new DefaultChatTransport({ fetch: customFetch }),
  []
);

const { messages, sendMessage, status, error } = useChat({
  id: conversationId || undefined,
  messages: dbToUIMessages(initialMessages),
  transport,
  onFinish: () => router.refresh(),
});
```

### Bot Selector Dropdown

Three grouped sections with dividers:

```
── Models ──
  Claude Haiku 4.5      [lock icon if free user]
  GPT-4o mini           [lock icon if free user]
── System Bots ──
  Code Tutor
  Fitness Coach
── My Bots ──           (Part 5, only if allowCustomBots)
  My Custom Bot
  + Create bot
```

Lock icon on inaccessible bots. Clicking a locked MODEL bot shows "Upgrade to unlock model access". Clicking a locked SYSTEM bot shows the required plan's name and checkout URL.

### Client-side `canAccessBot`

Duplicate of the server-side logic for instant UI feedback (locks, graying):

```ts
function canAccessBot(bot: Bot, userPlan: UserPlan, userId: string | null): boolean {
  if (bot.type === "MODEL") return !!userPlan;
  if (bot.type === "USER") return !!userId && bot.createdById === userId;
  if (!bot.planId) return true;
  if (!userPlan) return false;
  return userPlan.price >= (bot.plan?.price ?? 0);
}
```

### Smart Default Selection

```ts
const [selectedBotId, setSelectedBotId] = useState(() => {
  if (initialBotId) return initialBotId;
  if (conversationBotId) return conversationBotId;
  if (userPlan) {
    const firstModel = bots.find((b) => b.type === "MODEL");
    if (firstModel) return firstModel.id;
  }
  const firstFreeSystem = bots.find((b) => b.type === "SYSTEM" && !b.planId);
  return firstFreeSystem?.id || bots[0]?.id || "";
});
```

### Message Submission

On submit: check if user is authenticated (if not, show sign-in modal — Part 6). Check if selected bot is accessible. Send message using the AI SDK:

```ts
sendMessage({
  role: "user",
  parts: [{ type: "text", text: input }],
}, {
  body: { botId: selectedBotId, conversationId },
});
```

The `body` object is sent as additional JSON fields in the POST request to `/api/chat`.

### Additional UI

- Message list with user/assistant avatars, markdown rendering via `react-markdown`
- Streaming indicator (animated dots)
- Auto-scroll to bottom on new messages
- Messages remaining counter
- Daily limit reached state with countdown to UTC midnight

### Types and Props

```ts
type BotPlan = { price: number; name: string; checkoutUrl: string };

type Bot = {
  id: string;
  name: string;
  description: string;
  type: string; // "MODEL" | "SYSTEM" | "USER"
  createdById: string | null;
  planId: string | null;
  model: string | null;
  plan: BotPlan | null;
};

type UserPlan = { price: number; name: string } | null;

// Component props:
{
  bots: Bot[];
  initialConversationId: string | null;
  initialMessages: DBMessage[];
  initialBotId: string | null;
  conversationBotId: string | null;
  userPlan: UserPlan;
  userId: string | null;
  allowCustomBots: boolean;
}
```

## Chat Pages

**`src/app/chat/page.tsx`** — New chat page (server component):
- Fetches bots: `type: { in: ["SYSTEM", "MODEL"] }` + user's own USER bots if authenticated
- Accepts `?bot=` query param to pre-select a bot
- Smart default: paid users → first MODEL bot, free/unauth → first free SYSTEM bot
- Renders `<ChatArea>` with empty messages and no conversationId

**`src/app/chat/[conversationId]/page.tsx`** — Resume conversation (server component):
- Fetches conversation by ID, verifies `userId` ownership
- Loads messages ordered by `createdAt: "asc"`
- Fetches same bot list as the new chat page
- Renders `<ChatArea>` with existing messages and conversationId

## Home Page Update

Replace `src/app/page.tsx` with: `redirect("/chat")` — chat is now the landing page.

## Checkpoint

1. Visit `/chat` — see the bot selector dropdown with Models and System Bots sections
2. Select a free system bot, send a message — response streams in real-time
3. Check the sidebar — conversation appears with title (first 50 chars of your message)
4. Click the conversation to resume it — previous messages load
5. Select a MODEL bot (Claude or GPT) — if free user, see the lock icon and upgrade prompt
6. If paid user, chat with both Claude and GPT MODEL bots — both stream correctly
7. Send 20+ messages as free user — daily limit kicks in with countdown timer

---

> Files modified: `src/lib/env.ts`, `src/lib/whop.ts`

## Webhook Setup

Set up the Whop webhook in the sandbox dashboard:

1. Go to your app in `sandbox.whop.com` > Developer page > Webhooks
2. Create a webhook:
   - **URL**: `https://your-app.vercel.app/api/webhooks/whop`
   - **Events**: Select `membership_activated` and `membership_deactivated`
3. Copy the **webhook secret** (starts with `ws_`)
4. Add it to Vercel: `vercel env add WHOP_WEBHOOK_SECRET`

For local testing, use ngrok or Cloudflare Tunnel to expose localhost. Update the webhook URL to the tunnel URL temporarily.

## Company API Key

The app API key (`WHOP_API_KEY`) lacks the `access_pass:create` scope needed for `whop.products.create()` and `whop.plans.create()`. A separate company-level key is required.

1. In your Whop dashboard, go to **Business Settings > API Keys**
2. Create or copy a company API key (also starts with `apik_`)
3. Add to Vercel: `vercel env add WHOP_COMPANY_API_KEY`

Pull all env vars locally:

```bash
vercel env pull .env.local
```

## Env Validation Update

Add `WHOP_WEBHOOK_SECRET` and `WHOP_COMPANY_API_KEY` to the Zod schema in `src/lib/env.ts`. See file 1 (Foundation) for the final version of `env.ts`.

## Whop SDK Update

`src/lib/whop.ts` now includes `getCompanyWhop()` — a second Whop SDK client using the company API key. The full updated file is in file 1 (Foundation) (shown as the final version).

Key addition:

```ts
// Company API key client — for product/plan creation
let _companyWhop: Whop | null = null;
export function getCompanyWhop(): Whop {
  if (!_companyWhop) {
    _companyWhop = new Whop({
      apiKey: process.env.WHOP_COMPANY_API_KEY!,
      ...(process.env.WHOP_SANDBOX === "true" && {
        baseURL: "https://sandbox-api.whop.com/api/v1",
      }),
    });
  }
  return _companyWhop;
}
```

Also note in `getWhop()`: the `webhookKey` must be base64-encoded:

```ts
webhookKey: Buffer.from(process.env.WHOP_WEBHOOK_SECRET || "").toString("base64"),
```

## Webhook Handler

Handles `membership.activated` and `membership.deactivated` events. Uses signature verification via the Whop SDK and idempotency via unique WebhookEvent records.

```ts
// src/app/api/webhooks/whop/route.ts
import type { NextRequest } from "next/server";
import { getWhop } from "@/lib/whop";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event;
  try {
    event = getWhop().webhooks.unwrap(body, { headers });
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  // Idempotency: try to record event ID. Unique constraint catch = already processed.
  try {
    await prisma.webhookEvent.create({ data: { id: event.id } });
  } catch {
    return new Response("Already processed", { status: 200 });
  }

  if (event.type === "membership.activated") {
    await handleMembershipActivated(event.data, event.id);
  }

  if (event.type === "membership.deactivated") {
    await handleMembershipDeactivated(event.data, event.id);
  }

  return new Response("OK", { status: 200 });
}

async function handleMembershipActivated(
  membership: {
    id: string;
    user?: { id: string } | null;
    product: { id: string };
    renewal_period_start: string | null;
    renewal_period_end: string | null;
  },
  eventId: string
) {
  const whopUserId = membership.user?.id;
  if (!whopUserId) return;

  const user = await prisma.user.findUnique({ where: { whopUserId } });
  if (!user) return;

  // Look up plan by Whop product ID (not env var — plans are dynamic)
  const plan = await prisma.plan.findUnique({
    where: { whopProductId: membership.product.id },
  });
  if (!plan) return;

  await prisma.membership.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      planId: plan.id,
      status: "ACTIVE",
      whopMembershipId: membership.id,
      periodStart: parseTimestamp(membership.renewal_period_start),
      periodEnd: parseTimestamp(membership.renewal_period_end),
      lastWebhookEventId: eventId,
    },
    update: {
      planId: plan.id,
      status: "ACTIVE",
      whopMembershipId: membership.id,
      periodStart: parseTimestamp(membership.renewal_period_start),
      periodEnd: parseTimestamp(membership.renewal_period_end),
      lastWebhookEventId: eventId,
    },
  });
}

async function handleMembershipDeactivated(
  membership: { user?: { id: string } | null },
  eventId: string
) {
  const whopUserId = membership.user?.id;
  if (!whopUserId) return;

  const user = await prisma.user.findUnique({ where: { whopUserId } });
  if (!user) return;

  await prisma.membership.updateMany({
    where: { userId: user.id },
    data: {
      status: "CANCELLED",
      lastWebhookEventId: eventId,
    },
  });
}

function parseTimestamp(value: string | null): Date | null {
  if (!value) return null;
  const num = Number(value);
  if (!isNaN(num) && num > 0) return new Date(num * 1000);
  return new Date(value);
}
```

## Plan Management Server Actions

Uses `getCompanyWhop()` for Whop API calls. Creates a Whop product + billing plan for each app plan, stores the checkout URL.

```ts
// src/app/admin/plans/actions.ts
"use server";

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getCompanyWhop } from "@/lib/whop";

export async function createPlan(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const name = (formData.get("name") as string)?.trim();
  const priceStr = (formData.get("price") as string)?.trim();
  const allowCustomBots = formData.get("allowCustomBots") === "on";

  if (!name || !priceStr) {
    throw new Error("Name and price are required.");
  }

  const priceDollars = parseFloat(priceStr);
  if (isNaN(priceDollars) || priceDollars <= 0) {
    throw new Error("Price must be a positive number.");
  }

  const whop = getCompanyWhop();
  const companyId = process.env.WHOP_COMPANY_ID!;

  // Create Whop product
  const product = await whop.products.create({
    company_id: companyId,
    title: name,
  });

  // Create monthly billing plan within the product
  const whopPlan = await whop.plans.create({
    company_id: companyId,
    product_id: product.id,
    renewal_price: priceDollars,
    plan_type: "renewal",
    billing_period: 30,
  });

  // Store in DB — price in cents, checkout URL from Whop response
  await prisma.plan.create({
    data: {
      name,
      price: Math.round(priceDollars * 100),
      whopProductId: product.id,
      whopPlanId: whopPlan.id,
      checkoutUrl: whopPlan.purchase_url,
      allowCustomBots,
    },
  });

  redirect("/admin/plans");
}

export async function togglePlanActive(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const planId = formData.get("planId") as string;
  if (!planId) throw new Error("Plan ID is required.");

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found.");

  await prisma.plan.update({
    where: { id: planId },
    data: { isActive: !plan.isActive },
  });

  redirect("/admin/plans");
}

export async function deletePlan(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const planId = formData.get("planId") as string;
  if (!planId) throw new Error("Plan ID is required.");

  const activeMemberships = await prisma.membership.count({
    where: { planId, status: "ACTIVE" },
  });

  if (activeMemberships > 0) {
    throw new Error(
      "Cannot delete a plan with active memberships. Deactivate it instead."
    );
  }

  await prisma.bot.updateMany({
    where: { planId },
    data: { planId: null },
  });

  await prisma.plan.delete({ where: { id: planId } });

  redirect("/admin/plans");
}
```

## Plan Admin Page

Build `src/app/admin/plans/page.tsx` — server component:

- **Admin guard**: `isAdmin()` check, redirect to `/` if not admin
- **Data fetching**: Fetch all plans with `_count: { memberships: true, bots: true }` for display
- **Create form**: Fields — name (text), price (number, in dollars), allowCustomBots (checkbox). Form action: `createPlan`
- **Plan list**: Each plan shows name, price formatted as `$X.XX/month`, badges for "Custom bots" and "Inactive", member count, bot count, toggle active button, delete button
- **Delete protection**: Plans with active memberships can't be deleted (server-side check)

## Bot Admin Page Update

Update `src/app/admin/bots/page.tsx` to add a `planId` selector to the create form. Dropdown lists active plans + a "Free (no plan)" option. Existing bots show their assigned plan badge.

## Checkout Action

Build `src/app/checkout-action.ts` — server action that receives a plan's `checkoutUrl` and redirects the user. The sidebar settings popover calls this when the user clicks "Upgrade".

## Checkpoint

1. Create a plan in `/admin/plans` (e.g., "Pro" at $9/month) — it appears in the list
2. Check your Whop sandbox dashboard — a new product and billing plan exist
3. Assign the plan to a bot in `/admin/bots` — the bot shows the plan badge
4. As a non-admin user, see the locked bot with upgrade prompt showing the plan name
5. Click upgrade — redirected to Whop's hosted checkout page
6. Complete checkout — webhook fires, membership created, premium bots unlock
7. Cancel the plan from Whop — `membership.deactivated` webhook fires, access revoked

---

> Files modified: `src/lib/membership.ts`, `src/app/chat/page.tsx`, `src/app/chat/[conversationId]/page.tsx`, `src/app/chat/_components/chat-area.tsx`, `src/app/chat/_components/sidebar.tsx`, `src/app/api/chat/route.ts`, `src/app/chat/layout.tsx`

## Access Control Update

In `src/lib/membership.ts`, the `canAccessBot()` function already handles USER bots (added in Part 3):

```ts
if (bot.type === "USER") {
  return !!currentUserId && bot.createdById === currentUserId;
}
```

USER bots are strictly private — only the creator can see or use them.

Constants: `USER_BOT_LIMIT = 2`, `MAX_KNOWLEDGE_LENGTH = 50_000` (both configurable).

## Bot Server Actions

Zod validates all user input. Ownership checks on update/delete. Plan check + bot count limit on create.

```ts
// src/app/bots/actions.ts
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlan, USER_BOT_LIMIT, MAX_KNOWLEDGE_LENGTH } from "@/lib/membership";
import { SUPPORTED_MODELS } from "@/lib/ai";

const modelIds = SUPPORTED_MODELS.map((m) => m.id) as [string, ...string[]];

const botSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
  systemPrompt: z.string().min(1).max(5000),
  knowledge: z.string().max(MAX_KNOWLEDGE_LENGTH).optional(),
  model: z.enum(modelIds),
});

export async function createUserBot(formData: FormData) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const userPlan = await getUserPlan(user.id);
  if (!userPlan?.allowCustomBots) throw new Error("Custom bots not available on your plan");

  const count = await prisma.bot.count({
    where: { type: "USER", createdById: user.id },
  });
  if (count >= USER_BOT_LIMIT) throw new Error("Bot limit reached");

  const parsed = botSchema.parse({
    name: (formData.get("name") as string)?.trim(),
    description: (formData.get("description") as string)?.trim(),
    systemPrompt: (formData.get("systemPrompt") as string)?.trim(),
    knowledge: (formData.get("knowledge") as string)?.trim() || undefined,
    model: (formData.get("model") as string)?.trim(),
  });

  await prisma.bot.create({
    data: {
      ...parsed,
      knowledge: parsed.knowledge || null,
      type: "USER",
      createdById: user.id,
    },
  });

  redirect("/bots");
}

export async function updateUserBot(formData: FormData) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const botId = formData.get("botId") as string;
  if (!botId) throw new Error("Bot ID is required");

  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot || bot.type !== "USER" || bot.createdById !== user.id) {
    throw new Error("Bot not found");
  }

  const parsed = botSchema.parse({
    name: (formData.get("name") as string)?.trim(),
    description: (formData.get("description") as string)?.trim(),
    systemPrompt: (formData.get("systemPrompt") as string)?.trim(),
    knowledge: (formData.get("knowledge") as string)?.trim() || undefined,
    model: (formData.get("model") as string)?.trim(),
  });

  await prisma.bot.update({
    where: { id: botId },
    data: { ...parsed, knowledge: parsed.knowledge || null },
  });

  redirect("/bots");
}

export async function deleteUserBot(formData: FormData) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const botId = formData.get("botId") as string;
  if (!botId) throw new Error("Bot ID is required");

  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot || bot.type !== "USER" || bot.createdById !== user.id) {
    throw new Error("Bot not found");
  }

  await prisma.bot.delete({ where: { id: botId } });
  redirect("/bots");
}
```

## Bot Management Page

Build `src/app/bots/page.tsx` — server component:

- **Auth + plan guard**: `requireAuth()`, then `getUserPlan()`. Redirect to `/chat` if plan doesn't have `allowCustomBots`.
- **Data fetching**: Fetch user's bots with `type: "USER", createdById: user.id`
- **Display**: Bot count with limit (e.g., "1/2 bots"), list of bots as cards with name, description, model badge, edit link, delete button
- **Empty state**: "No custom bots yet" with link to create
- **Link to create**: `/bots/new` button (disabled if at limit)

## Bot Creation Form

Build `src/app/bots/new/page.tsx` — server component:

- **Auth + plan guard**: Same as management page
- **Form fields**: name (text, max 50), description (text, max 200), systemPrompt (textarea, max 5000), knowledge (textarea, optional, max 50K chars with counter), model (select from `SUPPORTED_MODELS`)
- **Form action**: `createUserBot`
- **UI**: Dark-themed form matching admin pages. Back link to `/bots`.

## Bot Edit Form

Build `src/app/bots/[botId]/edit/page.tsx` — server component:

- **Auth + ownership guard**: Fetch bot by ID, verify `bot.type === "USER"` and `bot.createdById === user.id`. Redirect to `/bots` if not owner.
- **Pre-filled form**: Same fields as creation, with `defaultValue` from existing bot data
- **Hidden input**: `botId` for the `updateUserBot` action
- **Form action**: `updateUserBot`

## Chat Integration

Update bot queries in the chat pages to include USER bots:

**`src/app/chat/page.tsx`** and **`src/app/chat/[conversationId]/page.tsx`**:
- Add USER bots to the query: `OR: [{ type: { in: ["SYSTEM", "MODEL"] } }, { type: "USER", createdById: user.id }]`
- Only include USER bots if user is authenticated

**`src/app/chat/_components/chat-area.tsx`**:
- Add "My Bots" section in dropdown after System Bots, with a divider
- Show user bots in this section
- Add "+ Create bot" link at the bottom (only if `allowCustomBots`)
- The `canAccessBot()` client-side function already handles USER type

**`src/app/api/chat/route.ts`**:
- Pass `user.id` to `canAccessBot()` — already done in Part 3

## Sidebar Update

In `src/app/chat/_components/sidebar.tsx`:
- Add "My Bots" link in the settings popover, between the plan badge and admin links
- Conditional on `userPlan?.allowCustomBots`
- Uses a Sparkles icon from lucide-react
- Links to `/bots`

## Checkpoint

1. As a user on a plan with `allowCustomBots`: visit `/bots` — see empty state with "Create" button
2. Create a bot with name, description, system prompt, knowledge text, and model selection
3. See the bot in `/bots` with "1/2 bots" counter
4. Edit the bot — form pre-fills with existing data
5. Go to `/chat` — see "My Bots" section in the dropdown with your custom bot
6. Chat with the custom bot — it uses your system prompt and knowledge
7. As a different user — the custom bot is invisible (private to creator)
8. Create a second bot — counter shows "2/2", create button disabled

---

> Files modified: `src/middleware.ts`, `src/app/api/auth/logout/route.ts`, `src/app/chat/layout.tsx`, `src/app/chat/page.tsx`, `src/app/chat/_components/chat-area.tsx`, `src/app/chat/_components/sidebar.tsx`

## Unauthenticated Browsing

Open `/chat` to unauthenticated visitors. They can browse bots and plans but must sign in to send messages.

### Middleware Update

Add `/chat` to public paths in `src/middleware.ts`:

```ts
const publicPaths = ["/sign-in", "/api/auth/", "/api/webhooks/", "/chat"];
```

### requireAuth with redirect: false

Throughout the chat pages and layout, use `requireAuth({ redirect: false })` to return `null` for unauthenticated users instead of redirecting:

```ts
const user = await requireAuth({ redirect: false });
// user is null for unauthenticated visitors
```

### Sign-In Modal

Build `src/app/chat/_components/sign-in-modal.tsx` — client component:

- Modal overlay with backdrop blur and centered card
- Heading: "Sign in to continue"
- Description text
- "Sign in with Whop" button linking to `/api/auth/login`
- Close button (X icon)
- Triggered when unauthenticated user clicks the message input or "New chat" button

### Layout Update

`src/app/chat/layout.tsx` becomes conditional (already shown in Part 3 above as the final version):
- **Authenticated**: fetch userPlan, conversations, cheapestPlan, isAdmin
- **Unauthenticated**: fetch active plans only (for the plans browsing modal)
- Pass `isAuthenticated={!!user}` and `userId` (nullable) to child components

### Chat Page Update

`src/app/chat/page.tsx` — bot query changes for unauthenticated:
- Unauth: `type: { in: ["SYSTEM", "MODEL"] }` (no USER bots)
- Auth: includes USER bots via `OR` clause

### Chat Area Update

Key changes in `src/app/chat/_components/chat-area.tsx`:

```ts
// userId becomes nullable
userId: string | null;

// Submit handler gates on authentication
const handleSubmit = () => {
  if (!userId) {
    setSignInOpen(true);
    return;
  }
  // ... normal submit logic
};
```

Messages remaining tracking via `X-Messages-Remaining` response header.

Daily limit countdown timer — calculates time to UTC midnight:

```ts
useEffect(() => {
  if (!hitDailyLimit) return;
  const tick = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCDate(midnight.getUTCDate() + 1);
    midnight.setUTCHours(0, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    setCountdown(`${h}h ${m}m ${s}s`);
  };
  tick();
  const interval = setInterval(tick, 1000);
  return () => clearInterval(interval);
}, [hitDailyLimit]);
```

## Conversation Management

### Server Actions

```ts
// src/app/chat/actions.ts
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function deleteConversation(conversationId: string) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.userId !== user.id) {
    throw new Error("Conversation not found");
  }

  await prisma.conversation.delete({ where: { id: conversationId } });
  redirect("/chat");
}

const renameSchema = z.object({
  title: z.string().min(1).max(100),
});

export async function renameConversation(
  conversationId: string,
  title: string
) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const parsed = renameSchema.parse({ title: title.trim() });

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.userId !== user.id) {
    throw new Error("Conversation not found");
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { title: parsed.title },
  });
}
```

### Sidebar Updates

In `src/app/chat/_components/sidebar.tsx`, add conversation management:

- **Rename**: Right-click or click edit icon → inline `<input>` replaces title text. `autoFocus`, `Enter` saves, `Escape` cancels, `onBlur` saves. Calls `renameConversation` server action.
- **Delete**: Two-click confirmation. First click shows "Delete?" text for 3 seconds (timeout via `setTimeout`), second click confirms and calls `deleteConversation`. Timer resets if user doesn't confirm.
- **Plans modal**: For free/unauthenticated users, a modal (via `createPortal`) shows available plans with name, price, features. Unauth users see "Sign in to upgrade" buttons. Free authed users see checkout links.
- **Unauthenticated sidebar bottom**: "Sign in with Whop" button instead of settings popover.

## Mobile Responsive Sidebar

### ChatShell Context

Build `src/app/chat/_components/chat-shell.tsx`:

```ts
// React context for sidebar toggle state
const SidebarToggleContext = createContext<() => void>(() => {});
export const useSidebarToggle = () => useContext(SidebarToggleContext);
```

Client component wrapping the layout. Manages `isOpen` state for mobile sidebar.

### CSS Approach

Single sidebar DOM node with responsive classes:

- **Mobile** (default): `fixed inset-y-0 left-0 z-50 w-72 transition-transform -translate-x-full` (hidden off-screen)
- **Mobile open**: `-translate-x-full` becomes `translate-x-0` (slides in)
- **Desktop** (`md:` breakpoint): `md:relative md:z-auto md:translate-x-0` (always visible, in flow)
- **Backdrop**: Semi-transparent overlay on mobile when sidebar is open, click to close

### Hamburger Button

In `chat-area.tsx` header: Menu icon button, visible only on mobile (`md:hidden`), calls `useSidebarToggle()`.

## Error Boundaries and Loading States

Build these standard Next.js files:

- **`src/app/error.tsx`**: Client component. Shows "Something went wrong" with a "Try again" button calling `reset()`. Dark-themed.
- **`src/app/not-found.tsx`**: Shows "Page not found" with "Back to chat" link. Dark-themed.
- **`src/app/chat/loading.tsx`**: Bouncing dots animation (3 dots with staggered animation delays).

## Production Deploy

### Switch Whop Environment

Create a production Whop app (or promote sandbox). Production apps use `whop.com` instead of `sandbox.whop.com`. The SDK handles routing automatically when `WHOP_SANDBOX` is not set.

### Update Vercel Environment Variables

In the Vercel dashboard, update for production:

| Variable | Note |
|----------|------|
| `WHOP_APP_ID` | From production app |
| `WHOP_API_KEY` | Production app API key |
| `WHOP_CLIENT_ID` | From production OAuth tab |
| `WHOP_CLIENT_SECRET` | From production OAuth tab |
| `WHOP_COMPANY_ID` | Production company ID |
| `WHOP_COMPANY_API_KEY` | Production company API key |
| `WHOP_WEBHOOK_SECRET` | Production webhook secret (base64-encoded) |
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | GPT API key |
| `NEXT_PUBLIC_APP_URL` | Production Vercel URL |
| `SESSION_SECRET` | Keep or regenerate |

**Remove** `WHOP_SANDBOX` — leaving it unset makes the SDK use production endpoints.

### Update Redirect URIs

In the production Whop app's OAuth settings, add your production Vercel URL as a redirect URI: `https://your-app.vercel.app/api/auth/callback`

### Re-create Plans and Seed Bots

Sandbox data doesn't carry over. After deploying:

1. Sign in as the admin (the Whop account that owns the app)
2. Go to `/admin/plans` — create the same plans (server actions provision them on Whop's production environment)
3. Go to `/admin/bots` — create system bots with the same names, descriptions, and system prompts. Assign premium bots to their plans.

### Test the Full Flow

1. Visit `/chat` without signing in — browse bots, click input, see sign-in modal
2. Sign in via Whop OAuth — full functionality, send messages, rename/delete conversations
3. Resize to mobile — sidebar collapses behind hamburger button
4. Upgrade via sidebar settings > complete Whop checkout > premium bots unlock
5. Create a custom bot and chat with it
6. Sign out > back to public chat page

Both Anthropic and OpenAI charge per token. Monitor usage through each provider's console and set spending alerts. The daily message limits (20 free / 50 paid) and bot limit (2 per user) are conservative defaults — adjust `FREE_DAILY_LIMIT`, `PAID_DAILY_LIMIT`, and `USER_BOT_LIMIT` in `src/lib/membership.ts`.

## Checkpoint

1. Visit `/chat` without signing in — bots browsable, clicking input opens sign-in modal
2. Sign in — full functionality (send messages, rename/delete conversations)
3. Resize to mobile — sidebar hides behind hamburger, slides in as overlay
4. Visit a nonexistent URL — 404 page with "Back to chat"
5. Update Vercel env vars for production, remove `WHOP_SANDBOX`, re-create plans and bots
6. Push to GitHub — Vercel auto-deploys. Test the full flow on production
