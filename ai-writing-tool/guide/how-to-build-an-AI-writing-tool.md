# Pencraft — AI Writing Tool Tutorial (LLM Context)

Condensed reference for building Pencraft, an AI writing studio on Whop. Use this as context when helping a reader follow along. Non-obvious files (Whop SDK calls, Vercel AI SDK wiring, Prisma 7 schema) are included in full. Standard React/Next.js files are described — the LLM can generate them.

---

## 1. Overview

**Product:** Pencraft, a standalone SaaS app where users sign in via Whop OAuth, pick a writing template (blog post, email, ad copy, etc.), fill in a few inputs, and get an AI-generated draft. They refine the output through a chat thread until it's ready to copy.

**Business model:** Two tiers via Whop Payments (direct SaaS, not connected accounts).

- **Free** — 3 templates, 5 generations per day
- **Pro** — all 8 templates, unlimited generations ($20/mo)

**Tech stack**

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS v4 |
| Auth | Whop OAuth 2.1 (PKCE) + iron-session |
| Payments | Whop Payments (embedded checkout via `@whop/checkout` + webhooks) |
| AI | Vercel AI SDK with direct provider keys (`@ai-sdk/anthropic`, `@ai-sdk/openai`) |
| Database | Neon (PostgreSQL) via Vercel Marketplace |
| ORM | Prisma 7 (client generated to `src/generated/prisma`) |
| Validation | Zod 4 |
| Deployment | Vercel |

**Pages**

- `/` — landing page with hero, bento features, pricing, and template showcase. Public.
- `/studio` — three-panel IDE: history sidebar, template form + generation output + refinement chat, template browser sidebar. Auth-gated by middleware.
- All old routes (`/templates`, `/history`) removed. OAuth callback redirects to `/studio`.

**API routes**

- `GET /api/auth/login` — PKCE challenge, nonce, redirect to Whop OAuth.
- `GET /api/auth/callback` — token exchange, userinfo, user upsert, redirect to `/studio`.
- `POST /api/auth/logout` — destroys session, redirects to `/`.
- `POST /api/generate` — runs `generateText`, persists a Generation record, prunes old rows.
- `POST /api/chat` — runs `streamText` over a generation's conversation, returns a UI message stream.
- `POST /api/webhooks/whop` — verifies signature with `whop.webhooks.unwrap`, handles membership events.

**Flow**

1. Guest visits `/`, signs in → Whop OAuth → callback → redirected to `/studio`.
2. User picks a template from the right sidebar, fills inputs, submits.
3. `/api/generate` calls `generateText` with the template's system prompt + inputs, persists the result, returns the generation ID.
4. User refines through the chat panel. `/api/chat` streams with `useChat`, persists each turn as a Message.
5. Free user hits 5/day → upgrade modal → embedded checkout popup (via `@whop/checkout`).
6. Whop fires `membership.activated` webhook → Membership row upserted → user instantly becomes Pro.

---

## 2. Setup

### Scaffold

```bash
npx create-next-app@latest pencraft --typescript --tailwind --app --src-dir --import-alias "@/*"
cd pencraft
```

### Dependencies

```bash
npm install @whop/sdk iron-session zod pg @prisma/adapter-pg
npm install ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/react
npm install react-markdown remark-gfm
npm install -D prisma @prisma/client tsx dotenv @types/pg
```

### Environment variables (added incrementally across parts)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Pooled Neon connection string (runtime) |
| `DATABASE_URL_UNPOOLED` | Direct Neon connection string (Prisma CLI) |
| `SESSION_SECRET` | 32+ char random string for iron-session cookie encryption |
| `NEXT_PUBLIC_APP_URL` | App origin (e.g., `http://localhost:3000`) |
| `WHOP_CLIENT_ID` | Whop OAuth client ID |
| `WHOP_CLIENT_SECRET` | Whop OAuth client secret |
| `WHOP_API_KEY` | Whop SDK API key |
| `WHOP_COMPANY_ID` | Whop company/business ID (used to create products) |
| `WHOP_SANDBOX` | `"true"` for sandbox; any other value for production |
| `WHOP_WEBHOOK_SECRET` | Webhook signing secret from Whop dashboard |
| `ANTHROPIC_API_KEY` | For Claude models via `@ai-sdk/anthropic` |
| `OPENAI_API_KEY` | For GPT models via `@ai-sdk/openai` |

Add to Vercel first, then pull with `vercel env pull .env.local`.

### Whop app setup

1. Create a Whop company in sandbox (`dash.whop.com` → business dropdown → New business).
2. Create an app. Enable OAuth. Set redirect URI to `{NEXT_PUBLIC_APP_URL}/api/auth/callback`. Required scopes: `openid profile email`.
3. Grab Client ID, Client Secret, API Key into env vars.
4. Webhooks tab → new endpoint → URL `{NEXT_PUBLIC_APP_URL}/api/webhooks/whop`. Subscribe to `membership.activated`, `membership.deactivated`, `membership.cancel_at_period_end_changed`. Copy signing secret → `WHOP_WEBHOOK_SECRET`.

### Neon via Vercel Marketplace

Vercel dashboard → Storage → Neon → Create. Auto-populates `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.

### AI provider keys

Direct provider keys (not Vercel AI Gateway):

- Anthropic console → API keys → `ANTHROPIC_API_KEY`
- OpenAI dashboard → API keys → `OPENAI_API_KEY`

---

## 3. Database schema

Prisma 7 — generator is `"prisma-client"` (not `"prisma-client-js"`), output to `src/generated/prisma`, import from `@/generated/prisma/client`. `url` is NOT set in `schema.prisma` (Prisma 7 removed it — connection comes from the adapter). `prisma.config.ts` uses `DATABASE_URL_UNPOOLED` for CLI.

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum MembershipStatus {
  ACTIVE
  CANCELLED
}

enum Tier {
  FREE
  PRO
}

enum MessageRole {
  USER
  ASSISTANT
}

model User {
  id         String   @id @default(cuid())
  whopUserId String   @unique
  email      String
  name       String?
  avatarUrl  String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  membership  Membership?
  generations Generation[]
}

model Plan {
  id            String   @id @default(cuid())
  name          String
  price         Int
  whopProductId String
  whopPlanId    String
  checkoutUrl   String
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())

  memberships Membership[]
}

model Membership {
  id                 String           @id @default(cuid())
  userId             String           @unique
  planId             String
  whopMembershipId   String           @unique
  status             MembershipStatus
  periodStart        DateTime
  periodEnd          DateTime
  cancelAtPeriodEnd  Boolean          @default(false)
  lastWebhookEventId String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  user User @relation(fields: [userId], references: [id])
  plan Plan @relation(fields: [planId], references: [id])
}

model Template {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  description  String
  category     String
  systemPrompt String
  inputFields  Json
  tier         Tier
  model        String
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  generations Generation[]
}

model Generation {
  id         String   @id @default(cuid())
  userId     String
  templateId String
  inputs     Json
  output     String
  title      String
  createdAt  DateTime @default(now())

  user     User     @relation(fields: [userId], references: [id])
  template Template @relation(fields: [templateId], references: [id])
  messages Message[]
}

model Message {
  id           String      @id @default(cuid())
  generationId String
  role         MessageRole
  content      String
  createdAt    DateTime    @default(now())

  generation Generation @relation(fields: [generationId], references: [id], onDelete: Cascade)
}
```

Push with `npx prisma db push`, generate with `npx prisma generate`, seed with `npx prisma db seed`.

### Seed templates

`prisma/seed.ts` upserts 8 templates. 3 are FREE (Blog Post, Email, Social Media Post), 5 are PRO (Ad Copy, Landing Page, Product Description, SEO Article, Press Release). Each template has a `model` string (`claude-haiku-4-5-20251001` or `gpt-4o-mini`), a `systemPrompt`, and an `inputFields` JSON array of `{ name, label, placeholder, type }`. The seed also upserts a placeholder Plan row with id `"pro-plan"` that gets replaced by real Whop IDs via `create-pro-plan.ts` later.

Example Blog Post template:

```ts
{
  name: "Blog Post",
  slug: "blog-post",
  description: "Well-structured articles with headings, introduction, and conclusion",
  category: "Content",
  tier: "FREE",
  model: "claude-haiku-4-5-20251001",
  systemPrompt: "You are a professional blog writer. Write a well-structured blog post based on the user's inputs.\n\nInclude:\n- An engaging introduction\n- Clear section headings formatted with ## in Markdown\n- Well-organized body paragraphs\n- A conclusion with a call to action\n\nFormat the output in Markdown.",
  inputFields: [
    { name: "topic", label: "Topic", placeholder: "e.g., Remote work", type: "text" },
    { name: "audience", label: "Target Audience", placeholder: "e.g., Remote workers", type: "text" },
    { name: "tone", label: "Tone", placeholder: "e.g., Professional", type: "text" },
    { name: "keyPoints", label: "Key Points", placeholder: "Main points", type: "textarea" },
  ],
}
```

---

## 4. Core libraries

### `src/lib/env.ts`

Lazy Proxy-based env validation so accessing an unset var only fails when that code path runs (not at import):

```ts
import { z } from "zod";

const envSchema = z.object({
  WHOP_CLIENT_ID: z.string(),
  WHOP_CLIENT_SECRET: z.string(),
  WHOP_API_KEY: z.string(),
  WHOP_COMPANY_ID: z.string(),
  WHOP_SANDBOX: z.string().optional().default("true"),
  DATABASE_URL: z.string(),
  DATABASE_URL_UNPOOLED: z.string(),
  SESSION_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  WHOP_WEBHOOK_SECRET: z.string(),
  ANTHROPIC_API_KEY: z.string(),
  OPENAI_API_KEY: z.string(),
});

type Env = z.infer<typeof envSchema>;

function createEnvProxy(): Env {
  return new Proxy({} as Env, {
    get(_, key: string) {
      const value = process.env[key];
      const shape = envSchema.shape as Record<string, z.ZodTypeAny>;
      const field = shape[key];
      if (!field) throw new Error(`Unknown env var: ${key}`);
      return field.parse(value);
    },
  });
}

export const env = createEnvProxy();
```

### `src/lib/whop.ts`

Sandbox-aware dual endpoint. `WHOP_SANDBOX === "true"` uses `sandbox-api.whop.com`:

```ts
import Whop from "@whop/sdk";
import { env } from "./env";

export const whop = new Whop({
  apiKey: env.WHOP_API_KEY,
});

export function getWhopBaseUrl() {
  return env.WHOP_SANDBOX === "true"
    ? "https://sandbox-api.whop.com"
    : "https://api.whop.com";
}
```

### `src/lib/ai.ts`

Provider routing by model ID prefix + prompt assembly:

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export function getModel(modelId: string): LanguageModel {
  if (modelId.startsWith("claude")) return anthropic(modelId);
  if (modelId.startsWith("gpt")) return openai(modelId);
  throw new Error(`Unknown model: ${modelId}`);
}

export function buildPrompt(
  systemPrompt: string,
  inputs: Record<string, string>,
  inputFields: { name: string; label: string }[]
): string {
  const inputSection = inputFields
    .map((field) => `**${field.label}:** ${inputs[field.name] || "Not provided"}`)
    .join("\n");

  return `${systemPrompt}\n\nThe user has provided the following inputs:\n\n${inputSection}\n\nGenerate the content based on these inputs.`;
}
```

### `src/lib/tier.ts`

Tier gating. Free users capped at 5 generations per day; Pro is unlimited:

```ts
import { prisma } from "./prisma";

export type UserTier = "FREE" | "PRO";

const FREE_DAILY_LIMIT = 5;

export async function getUserTier(userId: string): Promise<UserTier> {
  const membership = await prisma.membership.findUnique({
    where: { userId },
  });

  if (membership?.status === "ACTIVE") return "PRO";
  return "FREE";
}

export async function checkGenerationLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const tier = await getUserTier(userId);

  if (tier === "PRO") {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.generation.count({
    where: {
      userId,
      createdAt: { gte: today },
    },
  });

  return {
    allowed: count < FREE_DAILY_LIMIT,
    remaining: Math.max(0, FREE_DAILY_LIMIT - count),
    limit: FREE_DAILY_LIMIT,
  };
}

export async function getCheckoutUrl(): Promise<string | null> {
  const plan = await prisma.plan.findFirst({
    where: { isActive: true },
  });
  return plan?.checkoutUrl ?? null;
}

export async function getProPlanId(): Promise<string | null> {
  const plan = await prisma.plan.findFirst({
    where: { isActive: true },
  });
  return plan?.whopPlanId ?? null;
}
```

### Other libs (described — standard patterns)

- `src/lib/prisma.ts` — Prisma 7 singleton wrapping `PrismaPg` adapter + `Pool` from `pg`, using `DATABASE_URL` at runtime. Exports `prisma`.
- `src/lib/session.ts` — iron-session encrypted cookie named `pencraft_session`. Exports `getSession()` returning `{ userId?: string }`.
- `src/lib/auth.ts` — `requireAuth()` redirects unauthenticated users to `/`, returns the User row. `getOptionalUser()` returns null for guests (used on the landing page).

### `middleware.ts`

Protects `/studio`. Unauthenticated requests redirect to `/`:

```ts
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

interface SessionData {
  whopUserId?: string;
  userId?: string;
}

export async function middleware(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), {
    password: process.env.SESSION_SECRET!,
    cookieName: "pencraft_session",
  });

  const isAuthenticated = session.userId || session.whopUserId;
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*"],
};
```

---

## 5. Authentication

### Login — PKCE + nonce + Whop OAuth redirect

`src/app/api/auth/login/route.ts`:

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { getWhopBaseUrl } from "@/lib/whop";

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function randomString(len: number): string {
  return base64url(crypto.getRandomValues(new Uint8Array(len)));
}

async function sha256(str: string): Promise<string> {
  return base64url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
    )
  );
}

export async function GET() {
  const codeVerifier = randomString(32);
  const codeChallenge = await sha256(codeVerifier);
  const state = randomString(16);
  const nonce = randomString(16);

  const cookieStore = await cookies();
  cookieStore.set("pkce_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.WHOP_CLIENT_ID,
    redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const baseUrl = getWhopBaseUrl();
  return NextResponse.redirect(`${baseUrl}/oauth/authorize?${params}`);
}
```

### Callback — token exchange, userinfo, upsert, redirect to `/studio`

`src/app/api/auth/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { getWhopBaseUrl } from "@/lib/whop";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/?error=oauth_denied", env.NEXT_PUBLIC_APP_URL));
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  const codeVerifier = cookieStore.get("pkce_verifier")?.value;

  cookieStore.delete("oauth_state");
  cookieStore.delete("pkce_verifier");

  if (!code || !state || !codeVerifier || state !== storedState) {
    return NextResponse.redirect(new URL("/?error=invalid_state", env.NEXT_PUBLIC_APP_URL));
  }

  const baseUrl = getWhopBaseUrl();

  const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      client_id: env.WHOP_CLIENT_ID,
      client_secret: env.WHOP_CLIENT_SECRET,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      new URL("/?error=token_exchange_failed", env.NEXT_PUBLIC_APP_URL)
    );
  }

  const tokens = await tokenResponse.json();

  const userInfoResponse = await fetch(`${baseUrl}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoResponse.ok) {
    return NextResponse.redirect(
      new URL("/?error=userinfo_failed", env.NEXT_PUBLIC_APP_URL)
    );
  }

  const userInfo = await userInfoResponse.json();

  const user = await prisma.user.upsert({
    where: { whopUserId: userInfo.sub },
    update: {
      email: userInfo.email ?? "",
      name: userInfo.name ?? null,
      avatarUrl: userInfo.picture ?? null,
    },
    create: {
      whopUserId: userInfo.sub,
      email: userInfo.email ?? "",
      name: userInfo.name ?? null,
      avatarUrl: userInfo.picture ?? null,
    },
  });

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  return NextResponse.redirect(new URL("/studio", env.NEXT_PUBLIC_APP_URL));
}
```

### Logout (described)

`src/app/api/auth/logout/route.ts` — `POST` that calls `session.destroy()` and redirects to `/`.

---

## 6. AI generation

### `/api/generate` — text generation

Validates the request, enforces tier + daily limit, calls `generateText` via the Vercel AI SDK, persists a Generation row, prunes to the last 20 generations per user:

```ts
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { buildPrompt, getModel } from "@/lib/ai";
import { getUserTier, checkGenerationLimit } from "@/lib/tier";

const requestSchema = z.object({
  slug: z.string(),
  inputs: z.record(z.string(), z.string()),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { slug, inputs } = parsed.data;

  const template = await prisma.template.findUnique({ where: { slug } });
  if (!template || !template.isActive) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const tier = await getUserTier(session.userId);
  if (template.tier === "PRO" && tier === "FREE") {
    return NextResponse.json({ error: "Pro template requires upgrade" }, { status: 403 });
  }

  const { allowed } = await checkGenerationLimit(session.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Daily generation limit reached. Upgrade to Pro for unlimited." },
      { status: 429 }
    );
  }

  const inputFields = template.inputFields as unknown as { name: string; label: string }[];
  const prompt = buildPrompt(template.systemPrompt, inputs, inputFields);

  const result = await generateText({
    model: getModel(template.model),
    prompt,
  });

  const firstValue = Object.values(inputs)[0] || "Untitled";
  const title =
    firstValue.length > 50 ? firstValue.slice(0, 47) + "..." : firstValue;

  const generation = await prisma.generation.create({
    data: {
      userId: session.userId,
      templateId: template.id,
      inputs,
      output: result.text,
      title,
    },
  });

  const generations = await prisma.generation.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (generations.length > 20) {
    const toDelete = generations.slice(20).map((g: { id: string }) => g.id);
    await prisma.generation.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  const updatedLimit = await checkGenerationLimit(session.userId);
  return NextResponse.json({ generationId: generation.id, remaining: updatedLimit.remaining });
}
```

### `/api/chat` — refinement chat with streaming

Streams text back via `useChat`'s UI message protocol. Persists each turn as a Message row via `onFinish`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getModel } from "@/lib/ai";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  generationId: z.string(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { messages, generationId } = parsed.data;

  const generation = await prisma.generation.findUnique({
    where: { id: generationId },
    include: { template: true },
  });

  if (!generation || generation.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage.role === "user") {
    await prisma.message.create({
      data: {
        generationId,
        role: "USER",
        content: lastUserMessage.content,
      },
    });
  }

  const systemPrompt = `${generation.template.systemPrompt}

The user previously generated the following content:

${generation.output}

The user will ask you to revise the content. Maintain the same format and style while applying their feedback.`;

  const result = streamText({
    model: getModel(generation.template.model),
    system: systemPrompt,
    messages,
    onFinish: async ({ text }) => {
      await prisma.message.create({
        data: {
          generationId,
          role: "ASSISTANT",
          content: text,
        },
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
```

---

## 7. UI components (described)

All components live under `src/components/`. They use the theme tokens from `globals.css` (`--color-bg`, `--color-surface`, `--color-accent`, etc.) so light/dark/system theming works automatically.

**Studio (three-panel IDE at `/studio`)**

- `app-shell.tsx` (client) — root layout that positions the three panels, manages shared state via React Context (selected template, active generation, modal open states), slots `UpgradeModal` and `LimitModal`. Provides a `useApp()` hook.
- `header.tsx` (client) — top bar with logo, user dropdown (theme toggle, "Upgrade to Pro" entry if free, sign out). Never renders a "Sign in" button — `/studio` is always authenticated.
- `history-sidebar.tsx` (client) — left panel listing the user's recent Generations. Clicking one loads it into the center panel. Shows title + template name + relative date.
- `template-sidebar.tsx` (client) — right panel template browser. Groups templates by category. Shows Pro badge + lock icon on Pro templates when the user is Free. Clicking a Pro template while free opens the `UpgradeModal` instead of selecting it.
- `center-panel.tsx` (client) — main area. Renders either the template input form (when a template is selected but no generation exists yet) or the generation output + refinement chat (once there's an active generation).
- `generation-output.tsx` (client) — renders the generated text via the `<Markdown>` wrapper, with a copy-to-clipboard button.
- `refinement-chat.tsx` (client) — chat thread using `useChat` from `@ai-sdk/react`. `api: "/api/chat"`, passes `{ generationId }` as extra body data. Hydrates previous messages from the Generation's `messages` relation on mount.
- `markdown.tsx` (client) — `ReactMarkdown` + `remark-gfm` wrapper with Tailwind-styled `h1-h3`, `p`, `ul`, `ol`, `li`, `strong`, `em`, `a`, `code`, `pre`, `blockquote`, `hr`, and `table` components.
- `upgrade-modal.tsx` (client) — blurred backdrop modal with the Pro pitch. Clicking "Upgrade now" closes this modal and opens the embedded checkout popup via `openCheckoutPopup()` from AppShell context.
- `checkout-popup.tsx` (client) — modal overlay with `WhopCheckoutEmbed` from `@whop/checkout/react`. Renders the Whop checkout form inline. `onComplete` callback closes the popup and triggers a page refresh.
- `welcome-popup.tsx` (client) — auto-dismissing modal (5 seconds) shown after a successful upgrade. Confirms Pro status and lists unlocked features.
- `limit-modal.tsx` (client) — blurred backdrop modal shown when a Free user exhausts their daily limit.

**Landing (`/`)**

- `landing/landing-nav.tsx` (client, takes `isAuthenticated`) — sticky top nav. Logo on left; "Pricing", "Templates" anchors, and auth-aware CTA ("Sign in" or "Go to Studio") on the right.
- `landing/hero.tsx` (server, takes `isAuthenticated`) — hero with dual-gradient background, H1 "Draft anything. Refine with AI." (second line gradient-filled indigo → violet), subhead, primary + secondary CTAs.
- `landing/how-it-works.tsx` (server) — 3-step grid: Pick template → Fill inputs → Refine through chat.
- `landing/features-bento.tsx` (server) — bento grid (6-col × 2-row on desktop). Tiles: Eight templates (large), Streaming output, Refinement chat, Every draft saved, Light/dark modes.
- `landing/template-showcase.tsx` (server, takes `templates` prop) — responsive 4-col grid of all 8 templates with category, name, description, Pro badge on locked ones.
- `landing/pricing.tsx` (server, takes `isAuthenticated`) — two-card pricing: Free $0 vs Pro $20. Pro card has indigo border + glow + "Most popular" pill.
- `landing/final-cta.tsx` (server, takes `isAuthenticated`) — closing CTA with subtle indigo radial-gradient background.
- `landing/landing-footer.tsx` (server) — minimal footer: logo, copyright, GitHub link, "Built with Whop" link.

---

## 8. Pages (described)

- `src/app/layout.tsx` — root layout. Includes an inline `<script>` that reads `localStorage.theme` (or matches OS via `prefers-color-scheme`) and sets `<html class="dark">` before React hydrates. Prevents theme FOUC. Renders `{children}` and mounts the theme Inter font.
- `src/app/page.tsx` (landing) — server component. Reads `getOptionalUser()` + `prisma.template.findMany({ where: { isActive: true } })`. Composes `<LandingNav>`, `<Hero>`, `<HowItWorks>`, `<FeaturesBento>`, `<TemplateShowcase>`, `<Pricing>`, `<FinalCta>`, `<LandingFooter>`.
- `src/app/studio/page.tsx` — server component. Calls `requireAuth()` (redirects to `/` if not authenticated), fetches templates + user's generations + Pro plan ID via `getProPlanId()`, reads `searchParams.upgrade` for auto-opening checkout popup after OAuth redirect. Renders `<AppShell>` with `<Header>`, `<HistorySidebar>`, `<CenterPanel>`, `<TemplateSidebar>`, and slotted `<UpgradeModal>` + `<LimitModal>`. Passes `proWhopPlanId`, `checkoutEnvironment`, and `autoOpenCheckout` to AppShell.

---

## 9. Payments and webhooks

### Pro plan setup — programmatic, not dashboard

Run once locally to create the real Whop product + plan and persist the IDs to the Plan row. `prisma/create-pro-plan.ts`:

```ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import Whop from "@whop/sdk";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const isSandbox = process.env.WHOP_SANDBOX === "true";

const whop = new Whop({
  apiKey: process.env.WHOP_API_KEY!,
  baseURL: isSandbox
    ? "https://sandbox-api.whop.com/api/v1"
    : "https://api.whop.com/api/v1",
});

async function main() {
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!companyId) throw new Error("WHOP_COMPANY_ID is not set");

  const product = await whop.products.create({
    company_id: companyId,
    title: "Pencraft Pro",
    description: "All 8 writing templates and unlimited generations.",
  });

  const plan = await whop.plans.create({
    company_id: companyId,
    product_id: product.id,
    billing_period: 30,
    currency: "usd",
    initial_price: 20,
    renewal_price: 20,
  });

  const checkoutBase = isSandbox ? "sandbox.whop.com" : "whop.com";
  const checkoutUrl = `https://${checkoutBase}/checkout/${plan.id}`;

  await prisma.plan.upsert({
    where: { id: "pro-plan" },
    update: {
      name: "Pro",
      price: 2000,
      whopProductId: product.id,
      whopPlanId: plan.id,
      checkoutUrl,
      isActive: true,
    },
    create: {
      id: "pro-plan",
      name: "Pro",
      price: 2000,
      whopProductId: product.id,
      whopPlanId: plan.id,
      checkoutUrl,
      isActive: true,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Run with `npx tsx prisma/create-pro-plan.ts`.

### Webhook handler

`src/app/api/webhooks/whop/route.ts`:

```ts
import { NextRequest } from "next/server";
import Whop from "@whop/sdk";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const whopWebhook = new Whop({
  apiKey: env.WHOP_API_KEY,
  webhookKey: btoa(env.WHOP_WEBHOOK_SECRET),
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers);

  let webhookData: { type: string; data: Record<string, unknown> };
  try {
    webhookData = whopWebhook.webhooks.unwrap(body, { headers }) as unknown as {
      type: string;
      data: Record<string, unknown>;
    };
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  const { type, data } = webhookData;

  switch (type) {
    case "membership.activated": {
      const membershipId = data.id as string;
      const userId = (data.user as { id: string }).id;
      const planId = (data.plan as { id: string }).id;

      const existing = await prisma.membership.findUnique({
        where: { whopMembershipId: membershipId },
      });
      if (existing?.lastWebhookEventId === membershipId) break;

      const user = await prisma.user.findUnique({
        where: { whopUserId: userId },
      });

      const plan = await prisma.plan.findFirst({
        where: { whopPlanId: planId },
      });

      if (!user || !plan) break;

      await prisma.membership.upsert({
        where: { whopMembershipId: membershipId },
        update: {
          status: "ACTIVE",
          lastWebhookEventId: membershipId,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        create: {
          userId: user.id,
          planId: plan.id,
          whopMembershipId: membershipId,
          status: "ACTIVE",
          lastWebhookEventId: membershipId,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      break;
    }

    case "membership.deactivated": {
      const membershipId = data.id as string;
      await prisma.membership.updateMany({
        where: { whopMembershipId: membershipId },
        data: { status: "CANCELLED", cancelAtPeriodEnd: false },
      });
      break;
    }

    case "membership.cancel_at_period_end_changed": {
      const membershipId = data.id as string;
      const cancelAtPeriodEnd = data.cancel_at_period_end as boolean;
      await prisma.membership.updateMany({
        where: { whopMembershipId: membershipId },
        data: { cancelAtPeriodEnd },
      });
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
```

**Not handled:** `membership.renewed`, `membership.went_past_due` (out of scope for the tutorial).

### Upgrade flow

1. Free user clicks "Upgrade to Pro" in the header dropdown or hits a Pro template / daily limit. `UpgradeModal` opens.
2. Clicking "Upgrade now" closes the modal and opens `CheckoutPopup` — an embedded Whop checkout form rendered inline via `@whop/checkout`.
3. User completes payment without leaving the app.
4. `onComplete` fires → popup closes → 3-second processing overlay → `router.refresh()`.
5. Whop fires `membership.activated` → the handler upserts a Membership row with `status: "ACTIVE"`.
6. Page refresh picks up the new tier. `WelcomePopup` shows for 5 seconds confirming the upgrade.

---

## 10. Design

- **Accent:** `#6366f1` (indigo). Hover darkens to `#4f46e5` in light, brightens to `#818cf8` in dark.
- **Background:** `#ffffff` (light) / `#0a0a0b` (dark). Surface tones ladder up (`--surface`, `--surface-hover`, `--surface-active`).
- **Text:** primary / secondary / tertiary / muted, each with a light + dark value. Defined as CSS variables in `:root` and `.dark`.
- **Typography:** Inter (`next/font/google`). Landing H1 at `clamp(3rem, 6vw, 5.5rem)`, weight 600, tracking `-0.04em`. Section H2s at `clamp(2rem, 3vw, 3rem)`. Body 16px weight 400.
- **Theme toggle:** the user dropdown in the header has Light / Dark / System buttons. The selected value is written to `localStorage.theme`. The inline script in `layout.tsx` reads it on page load to prevent FOUC.

---

## 11. Whop SDK + Vercel AI SDK gotchas

1. **Sandbox endpoints** use `sandbox-api.whop.com` for all OAuth and API calls. Gate with `WHOP_SANDBOX === "true"`.
2. **OAuth 2.1 requires PKCE.** Store the code verifier in an httpOnly cookie, not the session. `client_secret` is still required in the token exchange even with PKCE (Whop-specific).
3. **`openid` scope requires a `nonce` parameter** on the auth request.
4. **Webhook signing key is base64-encoded** when instantiating the Whop SDK client: `webhookKey: btoa(env.WHOP_WEBHOOK_SECRET)`.
5. **Webhook verification:** call `whop.webhooks.unwrap(bodyText, { headers })`. Pass the raw body text, not parsed JSON. Convert headers with `Object.fromEntries(request.headers)`.
6. **Webhook payload nesting:** membership events use nested objects: `data.user.id` (not `data.user_id`), `data.plan.id` (not `data.plan_id`). The membership ID is at `data.id`.
7. **`products.create`** takes `company_id`, `title`, `description`. `plans.create` takes `company_id`, `product_id`, `billing_period` (days), `currency`, `initial_price`, `renewal_price`. Embedded checkout uses `planId` prop on `WhopCheckoutEmbed` with `environment: "sandbox" | "production"`.
8. **Prisma 7:** generator is `"prisma-client"` (no `-js`), output path is explicit, `url` is NOT in `schema.prisma` (comes from the `PrismaPg` adapter at runtime). CLI uses `DATABASE_URL_UNPOOLED` via `prisma.config.ts`.
9. **Vercel AI SDK provider routing:** the provider packages (`@ai-sdk/anthropic`, `@ai-sdk/openai`) are called as factories: `anthropic("claude-haiku-4-5-20251001")`, `openai("gpt-4o-mini")`. They return a `LanguageModel` passed to `generateText` or `streamText`.
10. **`streamText` chat protocol:** return `result.toUIMessageStreamResponse()` to speak the `useChat` UI message protocol. Persist with the `onFinish` callback so the DB write only happens after the full stream completes.
