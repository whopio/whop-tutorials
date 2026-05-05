# Linkstacks — Next.js + Whop Link-in-Bio Clone

A full-stack Linktree-style app where creators can publish a profile, gate premium links, accept payments, and withdraw earnings via Whop.

---

## 🚀 Tech Stack

- Next.js (App Router)
- React 19
- Tailwind CSS v4
- PostgreSQL (Prisma)
- Whop SDK + Embedded Components
- iron-session (auth)
- Zod (validation)
- dnd-kit (drag + reorder)

---

## 📦 Features

- Creator dashboard
- Public profile pages (`/u/[handle]`)
- Premium link gating
- One-time unlock payments
- Webhook-based payment verification
- Embedded payout portal
- Drag-and-drop link management
- Accent/theme system

---

## 🔁 Payment Flow

1. Creator enables earnings  
2. User clicks “Unlock”  
3. App creates a `PENDING` unlock  
4. Redirect to Whop checkout  
5. User pays  
6. Redirect back to app  
7. Unlock marked as `PAID`  
8. Webhook confirms as fallback  

---

## ⚙️ Environment Variables

Create a `.env` file:

```env
DATABASE_URL=
WHOP_APP_ID=
NEXT_PUBLIC_WHOP_APP_ID=
WHOP_CLIENT_ID=
WHOP_CLIENT_SECRET=
WHOP_API_KEY=
WHOP_PARENT_COMPANY_ID=
WHOP_WEBHOOK_SECRET=

WHOP_OAUTH_BASE=https://sandbox-api.whop.com
WHOP_BASE_URL=https://sandbox-api.whop.com/api/v1

NEXT_PUBLIC_WHOP_ENV=sandbox
NEXT_PUBLIC_APP_URL=http://localhost:3000

SESSION_SECRET=
```

---

## 🧱 Database Models

- `User`
- `Creator`
- `Link`
- `Unlock`
- `WebhookEvent`

### Key Concepts
- `Unlock` tracks payments
- `WebhookEvent` ensures idempotency
- `whopPaymentId` prevents double-processing

---

## 🔐 Authentication

- Whop OAuth (PKCE)
- Session stored via `iron-session`
- Dashboard routes protected server-side

---

## 💸 Checkout

Prices are stored in **cents**, but Whop expects **dollars**:

```ts
const priceInDollars = creator.unlockPrice / 100;
```

---

## 🔄 Webhooks

Handles:
- `payment.succeeded`
- `payment.failed`

Requirements:
- Use raw body (`req.text()`)
- Verify signature with Whop SDK
- Implement idempotency

---

## ⚠️ Critical Gotchas

1. Webhooks require raw body (not JSON)
2. `webhookKey` must be base64 encoded
3. Use **two-layer idempotency**
   - `WebhookEvent`
   - `Unlock.whopPaymentId`
4. Prices must be converted to dollars
5. `payoutMethods.list` is an async iterator
6. OAuth redirect URI must match exactly
7. Enable **Connected Account Events** in Whop dashboard
8. Do NOT recreate sub-companies on every request

---

## 🏦 Earnings Flow

- First call creates a **Whop sub-company**
- Stored as `whopCompanyId`
- Reused for future payouts
- KYC determines `payoutEnabled`

### Sandbox Behavior
- KYC is skipped
- `payoutEnabled` is set immediately

---

## 💰 Embedded Payout Portal

- Uses `@whop/embedded-components`
- Token must be a **function**, not a string
- SDK handles refresh automatically

---

## 🔒 Security

Make sure your CSP allows:

- `https://js.whop.com`
- `https://sandbox-js.whop.com` (dev only)

Missing this will break embedded components silently.

---

## 🧪 Local Development

```bash
npm install
npx prisma migrate dev
npm run dev
```

Use ngrok for OAuth + webhooks:

```bash
npx ngrok http 3000
```

---

## 📌 Notes

- Webhooks are the **source of truth**
- Redirect verification is just a fast path
- Always design for webhook retries
- Never trust client-side payment state

---

## 📄 License

MIT
