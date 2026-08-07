# Identity verification breakdown

Companion demo for the article **"How to integrate a KYC verification API into your platform"**. Fill in what your app already knows about somebody, press once, and the page starts a real identity check: a record id comes back, Whop's own verification UI mounts in the page, a webhook lands when the reviewer decides, and the confirmed name, date of birth and address are read back through a schema built to survive what real records actually look like.

Every step runs against the real Whop sandbox. No real identity is checked and no money moves.

Live demo: https://nextjs-whop-kyc-demo.vercel.app

## How the flow works

No database. The only state is an encrypted session cookie holding the account id and the verification id this visitor is working with.

1. Pressing **Start the check** creates a throwaway sub-account and then a verification against it. A real app skips the first half, because it already has the person it wants to verify.
2. `verifications.create` returns a record id prefixed `idpf_` and a `session_url`, the hosted page where the person proves who they are. Both `200` and `201` mean success: `201` is a new check, `200` hands back one that was already open.
3. `VerifyElement` mounts that flow inside the page, so the person never leaves. Their documents go straight to Whop and never touch this server.
4. Whop calls `/api/webhooks/whop` each time the record moves. The route verifies the signature against the raw body, skips deliveries it has already seen, and writes nothing from the payload.
5. The page re-reads the record instead, because a webhook says something changed rather than what is now true. The receiver cannot reach a visitor's cookie, so the page asks again rather than being told.
6. On approval the panel reads the account back and shows what verification actually bought: `standard_payout`, `crypto_payout` and `transfer` flipping to `active` while `required_actions` empties.

## Key files

- `lib/verification-schema.ts` - the defensive parser and the point of the whole exercise. Real records carry offset timestamps and three-letter address countries that a schema written from the docs rejects
- `lib/verification-schema.test.ts` - nine tests, several written against a record captured live rather than invented
- `app/api/verification/start/route.ts` - creates the check, sets the idempotency header by hand because the SDK drops the option, and requires a tax number when the country is `US`
- `app/api/verification/route.ts` - reads the record back. Never caches `session_url`, which expires after 7 days and vanishes from the response once the person is done
- `app/api/webhooks/whop/route.ts` - signature check on the raw body, dedupe on the delivery id, and no status writes
- `lib/store.ts` - stands in for the database a real app already has
- `lib/whop.ts` - the SDK client, including the sandbox `baseURL` override
- `app/api/token/route.ts` - mints the scoped short-lived token the embedded element runs on
- `next.config.ts` - the CSP the embedded element needs, including `apollo.elements.whop.com`

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your sandbox key and company id
npm run dev
```

You need a Whop sandbox company ([sandbox.whop.com](https://sandbox.whop.com/dashboard)) and a Company API key with `identity:read`, `identity:write` and `webhook_receive:identity_profiles`.

To see the webhook half, create a webhook in the sandbox dashboard under Developer pointing at your deployed URL plus `/api/webhooks/whop`, subscribe to the four `identity_profile_*` events, and paste the signing secret into `WHOP_WEBHOOK_SECRET`. Create it in the dashboard rather than through the API: the two are signed differently and only the dashboard kind verifies with the SDK.

```bash
npm run typecheck
npm test
```

## What this demo cannot do

The hosted verification flow includes a camera liveness check, and nothing in the API bypasses it. So a check only reaches `approved` if a person actually completes it, which takes a couple of minutes using the provider's own test documents. That ceiling is why the page is a working tool rather than a guided walkthrough: everything up to the handoff is real, and the part that cannot be automated is left to you.

Verification is also not the last gate before money moves. Approval switches the payout capabilities on, which is what this demo shows, but the payouts side runs its own checks afterwards.

## Fonts

The live demo uses Whop's licensed typefaces. Those files are not redistributed here, so `app/globals.css` falls back to system fonts. Drop your own into `public/fonts` and add the `@font-face` rules if you want the exact look.
