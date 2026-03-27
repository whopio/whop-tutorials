# Courstar (Udemy Clone)

A multi-instructor online course marketplace where users sign up, become teachers, create video courses, set prices, and publish them for students to browse, purchase, and learn from. Built with Next.js 16, Prisma 7, Mux, and the Whop SDK.

## Features

- **OAuth Authentication** - Secure login via Whop with PKCE flow
- **Instructor Onboarding** - Connected account creation with KYC via Whop for Platforms
- **Course Builder** - Inline section/lesson CRUD with video upload
- **Video Hosting** - Direct browser-to-Mux uploads, adaptive streaming, signed playback tokens
- **One-Time Purchases** - Whop hosted checkout with 20% platform application fee
- **Payment Webhooks** - Automatic enrollment creation on `payment.succeeded`
- **Progress Tracking** - Per-lesson completion with auto-complete on video end
- **Course Reviews** - 1-5 star ratings with optional comments, one per enrollment
- **Student Dashboard** - Enrolled courses with progress bars, resume from last lesson
- **Instructor Dashboard** - Course management, earnings estimate, delete with Mux cleanup
- **Landing Page** - DB-driven stats, popular courses, category browsing, instructor CTA
- **Instructor Profiles** - Public pages with bio, stats, and published courses

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | Full-stack React framework (App Router) |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Prisma 7](https://www.prisma.io/) | Database ORM (with `@prisma/adapter-pg`) |
| [Neon](https://neon.tech/) | Serverless PostgreSQL (via Vercel integration) |
| [Whop SDK](https://dev.whop.com/) | Payments, connected accounts, OAuth, KYC |
| [Mux](https://mux.com/) | Video upload, transcoding, signed playback |
| [Iron Session](https://github.com/vvo/iron-session) | Encrypted cookie sessions |
| [Zod](https://zod.dev/) | Request validation |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling |

## Getting Started

### Prerequisites

- Node.js 18+
- [Whop Developer Account](https://sandbox.whop.com/)
- [Vercel Account](https://vercel.com/)
- [Mux Account](https://mux.com/) (free tier)

### 1. Clone the repository

```bash
git clone https://github.com/whopio/whop-tutorials.git
cd whop-tutorials/udemy-clone
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

See `.env.example` for all required variables and where to find them.

### 4. Set up the database

Add the Neon integration to your Vercel project, then:

```bash
npx prisma generate
npx prisma db push
```

### 5. (Optional) Seed demo data

To populate the app with demo instructors and courses:

```bash
npx ts-node prisma/seed.ts
```

To create real Whop sandbox companies for seeded instructors, set `WHOP_SANDBOX_EMAIL` in your `.env.local` to a real email address.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Configure webhooks

**Whop webhook:** In your Whop developer dashboard (sandbox.whop.com > Dashboard > Developer), create a company-level webhook pointing to:

```
https://your-domain.com/api/webhooks/whop
```

Enable "Connected account events" and subscribe to `payment.succeeded`.

**Mux webhook:** In the Mux dashboard (Settings > Webhooks), create a webhook pointing to:

```
https://your-domain.com/api/webhooks/mux
```

Subscribe to `video.asset.ready` and `video.upload.asset_created`.

## Project Structure

```
udemy-clone/
├── prisma/
│   ├── schema.prisma              # Database schema (9 models)
│   └── seed.ts                    # Demo data seed script
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/              # OAuth login/callback/logout
│   │   │   ├── courses/           # Free enrollment, reviews
│   │   │   ├── lessons/           # Progress tracking
│   │   │   ├── playback/          # Signed Mux playback tokens
│   │   │   ├── teach/             # Instructor onboarding, course CRUD, upload, publish
│   │   │   └── webhooks/          # Whop and Mux webhook handlers
│   │   ├── courses/               # Catalog, detail, player pages
│   │   ├── dashboard/             # Student dashboard
│   │   ├── instructors/           # Instructor profiles
│   │   ├── sign-in/               # Login page
│   │   └── teach/                 # Instructor onboarding, dashboard, editor
│   ├── components/                # React components
│   ├── generated/prisma/          # Generated Prisma client
│   └── lib/                       # Auth, session, env, Whop SDK, Mux, Prisma, utilities
└── guides/                        # Condensed AI-readable tutorial spec
```

## Database Schema

```
User ──────┬──── CreatorProfile ──────┬──── Course ──────┬──── Section ──── Lesson
           │                          │                  │
           ├──── Enrollment ──────────┘                  ├──── Enrollment
           ├──── Progress (per lesson)                   └──── Review
           └──── Review

WebhookEvent (idempotency tracking for Whop + Mux)
```

## Sandbox vs Production

| Environment | Dashboard | API | Payments |
|-------------|-----------|-----|----------|
| **Sandbox** | sandbox.whop.com | sandbox-api.whop.com | Test cards only |
| **Production** | whop.com | api.whop.com | Real payments |

Set `WHOP_SANDBOX="true"` for development. Remove it for production.

### Test Cards (Sandbox)
- `4242 4242 4242 4242` - Successful payment
- Any future expiration date and any 3-digit CVC

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables (remove `WHOP_SANDBOX` for production)
4. Set Whop webhook URL to `https://your-app.vercel.app/api/webhooks/whop`
5. Set Mux webhook URL to `https://your-app.vercel.app/api/webhooks/mux`
6. Set OAuth redirect URL to `https://your-app.vercel.app/api/auth/callback`
7. Deploy

### Other Platforms

```bash
npm run build
npm start
```

Requires Node.js 18+ runtime, PostgreSQL database, and all environment variables configured.

## Disclaimer

This project is for **educational purposes only** and is not intended for production use. It demonstrates core concepts for building a course marketplace but omits certain security hardening and scalability measures that would be required in a real-world application.

## License

MIT

## Acknowledgments

- [Whop](https://whop.com) for the payment infrastructure
- [Vercel](https://vercel.com) for Next.js and hosting
- [Prisma](https://prisma.io) for the ORM
- [Mux](https://mux.com) for video infrastructure
