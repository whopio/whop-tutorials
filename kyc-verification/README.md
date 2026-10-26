# Identity verification breakdown

Companion demo for the article **"How to integrate a KYC verification API into your platform"**. Fill in what your app already knows about somebody, press once, and the page starts a real identity check: a record id comes back, Whop's own verification UI mounts in the page, a webhook lands when the reviewer decides, and the confirmed name, date of birth and address are read back through a schema built to survive what real records actually look like.

Every step runs against the real Whop sandbox. No real identity is checked and no money moves.

Live demo: https://nextjs-whop-kyc-demo.vercel.app

## How the flow works

No database. The only state is an encrypted session cookie holding the account id and the verification id this visitor is working with.

1. Pressing **Start the check** creates a throwaway connected account with `accounts.create`, which lands under the business that owns the API key, and then a verification against it. A real app skips the first half, because it already has the person it wants to verify.
2. `verifications.create` takes the pre-filled fields inside `body` and returns a record id prefixed `idpf_` and a `session_url`, the hosted page where the person proves who they are. Both `200` and `201` mean success: `201` is a new check, `200` hands back one that was already open.
3. `VerifyElement` mounts that flow inside the page, so the person never leaves. Their documents go straight to Whop and never touch this server.
4. Whop calls `/api/webhooks/whop` each time the record moves. The route verifies the signature against the raw body with `unwrapWebhook` and the raw `ws_` secret, re-reads the record to log its real status, skips deliveries it has already seen, and writes nothing from the payload. A failed re-read answers `502`, so Whop retries the delivery.
5. The page re-reads the record instead, because a webhook says something changed rather than what is now true. The receiver cannot reach a visitor's cookie, so the page asks again rather than being told.
6. On approval the panel reads the account back and shows what verification actually bought: `standard_payout`, `crypto_payout` and `transfer` flipping to `active` while `required_actions` empties.

## Key files

- `lib/verification-schema.ts` - the defensive parser and the point of the whole exercise. Real records carry offset timestamps and three-letter address countries that a schema written from the docs rejects
- `lib/verification-schema.test.ts` - ten tests, several written against a record captured live rather than invented
- `app/api/verification/start/route.ts` - creates the check with a per-request `idempotencyKey` derived from the account, so a retry never opens a second one, and requires a tax number when the country is `US`
- `app/api/verification/route.ts` - reads the record back. Never caches `session_url`, which expires after 7 days and vanishes from the response once the person is done
- `app/api/webhooks/whop/route.ts` - `unwrapWebhook` on the raw body, a re-read of the record, dedupe on the delivery id, and no status writes
- `lib/payout-gate.ts` - `canReceivePayouts`, the article's payout gate. The page does not call it, because the demo has no payout route
- `lib/store.ts` - stands in for the database a real app already has
- `lib/whop.ts` - the `@whop/sdk` 2.4.0 client, pointed at `WhopEnvironment.Sandbox` when `WHOP_SANDBOX` is `true`
- `app/api/token/route.ts` - mints the scoped short-lived token the embedded element runs on
- `next.config.ts` - the CSP the embedded element needs, including `apollo.elements.whop.com`

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your sandbox key and company id
npm run dev
```

You need a Whop sandbox company ([sandbox.whop.com](https://sandbox.whop.com/dashboard)) and a Company API key with `identity:read`, `identity:write` and `webhook_receive:identity_profiles`.

To see the webhook half, create a webhook in the sandbox dashboard under Developer pointing at your deployed URL plus `/api/webhooks/whop`, subscribe to `identity_profile.approved`, `identity_profile.needs_action`, `identity_profile.rejected` and `identity_profile.updated`, and paste the signing secret into `WHOP_WEBHOOK_SECRET` exactly as shown. The SDK's `unwrapWebhook` takes the raw `ws_` secret, with no base64 step.

```bash
npm run typecheck
npm test
```

## Sandbox behaviour this demo relies on

Verified live on `@whop/sdk` 2.4.0, 2026-10-25.

- A new check comes back `pending` with a `session_url`, and the pre-filled name, date of birth and address read back unchanged on the record.
- Starting again for the same account hands back the same `idpf_` record.
- Before approval, `standard_payout`, `crypto_payout`, `transfer` and `card_issuing` all read `inactive`, and `required_actions` holds `verify_identity`.
- The `session_url` opens the verification provider's sandbox page, branded "Whop Verification", with three steps: an ID document, a liveness check and personal information. It starts behind an agreements dialog the person accepts.
- Reading an `idpf_` id that does not exist throws `Whop.NotFoundError` with `statusCode` 404.

## What this demo cannot do

The hosted verification flow includes a camera liveness check, and nothing in the API bypasses it. So a check only reaches `approved` if a person actually completes it, which takes a couple of minutes using the provider's own test documents. That ceiling is why the page is a working tool rather than a guided walkthrough: everything up to the handoff is real, and the part that cannot be automated is left to you.

Verification is also not the last gate before money moves. Approval switches the payout capabilities on, which is what this demo shows, but the payouts side runs its own checks afterwards.

## Fonts

The live demo uses Whop's licensed typefaces. Those files are not redistributed here, so `app/globals.css` falls back to system fonts. Drop your own into `public/fonts` and add the `@font-face` rules if you want the exact look.
