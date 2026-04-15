# Pencraft (AI Writing Tool)

An AI writing studio where users sign in via Whop OAuth, pick a writing template, fill in a few inputs, and get a streaming AI-generated draft. They refine the output through a chat thread until it's ready to copy. Built with Next.js 16, Prisma 7, the Vercel AI SDK, and the Whop SDK.

## Features

- **OAuth Authentication** - Secure login via Whop with PKCE flow and OpenID nonce verification
- **Landing + Studio Split** - Marketing landing page at `/` with a sliding-text hero, authenticated IDE at `/studio`
- **8 Writing Templates** - Blog post, email, social post, ad copy, landing page, product description, SEO article, press release
- **Streaming AI Generation** - Non-blocking text generation via the Vercel AI SDK's `generateText` / `streamText`
- **Refinement Chat** - Per-generation chat thread using `useChat` from `@ai-sdk/react` with persisted turns
- **Markdown Output** - `react-markdown` + `remark-gfm` renders headings, lists, tables, code, and quotes
- **Generation History** - Sidebar lists the user's last 20 generations; older rows are pruned automatically
- **Tiered Access** - Free (3 templates, 5 generations/day) vs Pro (all 8 templates, unlimited generations)
- **Whop Payments** - Pro upgrade flows through Whop's hosted checkout; membership state managed via webhooks
- **Webhook-Driven Membership Updates** - `membership.activated`, `membership.deactivated`, and `membership.cancel_at_period_end_changed` keep the Membership row in sync with Whop
- **Multi-Provider AI** - Templates declare a model ID; `getModel()` routes to `@ai-sdk/anthropic` or `@ai-sdk/openai`
- **Light / Dark / System Theme** - User dropdown toggle with `localStorage` persistence and FOUC prevention

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | Full-stack React framework (App Router) |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Prisma 7](https://www.prisma.io/) | Database ORM (with driver adapter) |
| [PostgreSQL](https://www.postgresql.org/) | Database (via Neon) |
| [Whop SDK](https://dev.whop.com/) | OAuth, Payments, webhooks |
| [Vercel AI SDK](https://ai-sdk.dev/) | Streaming text generation and UI chat protocol |
| [@ai-sdk/anthropic](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) | Claude model provider |
| [@ai-sdk/openai](https://ai-sdk.dev/providers/ai-sdk-providers/openai) | GPT model provider |
| [Iron Session](https://github.com/vvo/iron-session) | Encrypted cookie sessions |
| [Zod](https://zod.dev/) | Request and env validation |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- [Whop Developer Account](https://sandbox.whop.com/)
- [Anthropic API key](https://console.anthropic.com/)
- [OpenAI API key](https://platform.openai.com/)

### 1. Clone the repository

```bash
git clone https://github.com/whopio/whop-tutorials.git
cd whop-tutorials/pencraft
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

See `.env.example` for all required variables and where to find them.

### 4. Set up the database

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

The seed command inserts the 8 writing templates and a Pro plan placeholder row.

### 5. Create the Pro product and plan on Whop

The Pro tier is represented by a real Whop product + plan. Run the helper script once to create them through the Whop API and upsert the IDs into your local `Plan` row:

```bash
npx tsx prisma/create-pro-plan.ts
```

This requires `WHOP_API_KEY` and `WHOP_COMPANY_ID` to be set in `.env`.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Configure Whop OAuth

In your Whop app settings (sandbox.whop.com > Developer > Your App > OAuth tab), add redirect URIs:

```
http://localhost:3000/api/auth/callback
https://your-domain.com/api/auth/callback
```

Required scopes: `openid profile email`.

### 8. Configure Whop webhooks

In your Whop developer dashboard (sandbox.whop.com > Developer > Webhooks), create a webhook pointing to:

```
https://your-domain.com/api/webhooks/whop
```

Subscribe to these events:

- `membership.activated`
- `membership.deactivated`
- `membership.cancel_at_period_end_changed`

## Project Structure

```
pencraft/
├── prisma/
│   ├── schema.prisma              # Database schema (6 models + 3 enums)
│   ├── seed.ts                    # 8 writing templates + Pro plan placeholder
│   └── create-pro-plan.ts         # Creates the Whop product + plan, upserts IDs
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/              # OAuth login, callback, logout
│   │   │   ├── chat/              # Refinement chat streaming endpoint
│   │   │   ├── generate/          # Template-based text generation
│   │   │   └── webhooks/whop/     # Membership event handler
│   │   ├── studio/                # Authenticated three-panel IDE
│   │   ├── page.tsx               # Landing page
│   │   └── layout.tsx             # Root layout with theme FOUC script
│   ├── components/
│   │   ├── landing/               # Landing hero, marquee, features, pricing
│   │   ├── app-shell.tsx          # Studio root with React Context
│   │   ├── header.tsx             # Top bar, user dropdown, theme toggle
│   │   ├── history-sidebar.tsx    # Left panel — past generations
│   │   ├── template-sidebar.tsx   # Right panel — template browser
│   │   ├── center-panel.tsx       # Form + generation + chat
│   │   ├── generation-output.tsx  # Markdown-rendered output + copy button
│   │   ├── refinement-chat.tsx    # useChat thread
│   │   ├── markdown.tsx           # react-markdown wrapper
│   │   ├── upgrade-modal.tsx      # Blurred Pro upgrade modal
│   │   └── limit-modal.tsx        # Blurred daily-limit modal
│   └── lib/                       # env, prisma, session, auth, whop, ai, tier
└── middleware.ts                  # Protects /studio, redirects guests to /
```

## Database Schema

```
User ──────┬──── Membership ──── Plan
           │
           └──── Generation ──┬──── Template
                              │
                              └──── Message

Enums: MembershipStatus (ACTIVE, CANCELLED), Tier (FREE, PRO), MessageRole (USER, ASSISTANT)
```

Free users have no `Membership` row. Pro users have exactly one, keyed by `userId`. Membership state is driven by Whop webhooks — `lastWebhookEventId` guards against duplicate delivery.

## Sandbox vs Production

| Environment | Dashboard | API | Payments |
|-------------|-----------|-----|----------|
| **Sandbox** | sandbox.whop.com | sandbox-api.whop.com | Test cards only |
| **Production** | whop.com | api.whop.com | Real payments |

Set `WHOP_SANDBOX=true` for development. Remove it (or set to anything else) for production.

### Test Cards (Sandbox)

- `4242 4242 4242 4242` — Successful payment
- Any future expiration date, any 3-digit CVC

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set the **Build Command** to `npx prisma generate && next build` in Project Settings
4. Add all environment variables (remove `WHOP_SANDBOX` for production)
5. Set the Whop webhook URL to `https://your-app.vercel.app/api/webhooks/whop`
6. Set the OAuth redirect URL to `https://your-app.vercel.app/api/auth/callback`
7. Deploy

### Other Platforms

```bash
npx prisma generate
npm run build
npm start
```

Requires Node.js 18+ runtime, PostgreSQL database, and all environment variables configured.

## Disclaimer

This project is for **educational purposes only** and is not intended for production use. It demonstrates core concepts for building an AI-powered SaaS on Whop but omits security hardening, rate limiting, abuse protection, and scalability measures that would be required in a real-world application.

## License

MIT

## Acknowledgments

- [Whop](https://whop.com) for the auth and payment infrastructure
- [Vercel](https://vercel.com) for Next.js, the AI SDK, and hosting
- [Prisma](https://prisma.io) for the ORM
- [Anthropic](https://www.anthropic.com) for Claude
- [OpenAI](https://openai.com) for GPT
- [Neon](https://neon.tech) for PostgreSQL
