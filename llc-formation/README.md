# LLC formation breakdown

Companion demo for the article **"LLC formation API: How to form an LLC with a single API call"**. It opens on a platform's user list, five people at different stages of forming a company, and only one of them still needs one. Pick that user, fill in their company, their founders, and their address, then send the application and read what Whop says back. The last panel shows where the checkout would open and what the filing does after it is paid.

Every submission on this page is a real call to the Whop sandbox. Nothing is filed and nothing is charged, because the sandbox cannot form a company at all.

Live demo: https://nextjs-whop-llc-formation-demo.vercel.app

## How the flow works

No database, no webhooks, and no session. The only state is React state in the browser, so a refresh starts over.

1. `RosterPanel` lists the platform's users. Only the first row is live and maps to the demo's sandbox account. The other four carry `live: false` and render as example states, because every stage after `draft` begins when somebody pays and the sandbox has no way to do that.
2. Picking the user who has no company yet opens the application form. Picking anyone else swaps it for `TrackingPanel`, which renders that user's `company_formation` state instead.
3. `CompanyPanel` and `FoundersPanel` collect the application. The three taxonomy fields cascade, so changing the business type resets the industry group and type beneath it.
4. `SendPanel` shows the exact request body, built by the same `toRequestBody` the route uses, so what is on screen is what goes over the wire.
5. `/api/formation` rate limits, parses with Zod, mints a fresh idempotency key, and calls `POST /accounts/{id}/form_company`.
6. `preflight` reads the answer. A 400 saying `Incorporation seller company is not configured` means the application passed everything and stopped at the checkout step, so the demo reports it as accepted. Any other 400 is a real refusal, and `fieldFor` maps the sentence back to the input that caused it.
7. `findUnchecked` runs our own checks on the same application and reports what Whop accepted but a state would not.

## Key files

- `app/api/formation/route.ts` - the trust boundary: rate limit, Zod parse, fresh idempotency key, then the call
- `lib/formation/preflight.ts` - the call itself, and the branch that treats the seller-company error as a pass
- `lib/formation/errors.ts` - maps each refusal sentence back to a field, matched on office names rather than whole sentences
- `lib/formation/unchecked.ts` - the checks Whop does not run, which is the point of the article
- `lib/formation/schema.ts` - the Zod schema and `toRequestBody`, which strips whatever the entity type ignores
- `lib/whop.ts` - the fetch wrapper, hardcoded to the sandbox host
- `lib/env.ts` - refuses to boot unless `WHOP_SANDBOX` is true
- `components/FormationLab.tsx` - holds the application state and swaps the form for the tracking view
- `constants/taxonomy.json` - the full business taxonomy, 13 business types, 119 industry groups, 2,033 industry types

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your sandbox key and company id
npm run dev
```

You need a Whop sandbox company ([sandbox.whop.com](https://sandbox.whop.com/dashboard)) and a Company API key with `incorporation:write`, `incorporation:read`, `company:basic:read` and `webhook_receive:accounts`.

There is no setup script and no `constants/whop-ids.ts` here, because formation runs against an account you already have rather than a product this demo creates. Put your `biz_` id in `WHOP_COMPANY_ID` and that is the whole configuration.

There are no test cards either. The sandbox never reaches a checkout, so nothing in this demo can be paid.

## Sandbox behaviour this demo relies on

Verified live, 2026-08-25.

- The sandbox validates a formation in full and then stops with `Incorporation seller company is not configured`, a 400, at the exact point it would create the checkout. It never returns a `checkout_url`. Production returns 200 on the same body.
- Nothing is written to the account until the checkout is paid. After roughly forty sandbox probes and one successful production call, `company_formation` was still `{"status":"draft"}` and `business_name` was still `null` on both accounts.
- Whop reports one problem at a time, with no field name, so an application with three mistakes takes three round trips.
- The officer roles message is assembled from whichever offices are missing. It arrives as `Add a secretary before submitting` with one gap and `Add a secretary, treasurer, and director before submitting` with three, so matching on a fixed sentence breaks.
- The free text fields are stored as sent. An email of `not-an-email`, a phone of `555-0100`, a date of birth of `2024-01-01`, no date of birth at all, and a postal code of `ZZZZZ` were all accepted.
- Replaying a used `Idempotency-Key` with a different body returns its own 400 that reads like a validation failure, which is why every submission mints a new one.

## What this demo deliberately leaves out

Webhooks, a database, and connected account creation. A real platform calls `POST /accounts` once per user at signup and stores the id, then listens for `account.updated` to follow a filing through `processing`, `filed` and `completed`. This demo reuses one sandbox account and never creates another, so a visitor cannot leave businesses behind in the sandbox by loading the page. The tracking view renders those later stages from their documented shapes rather than from live data, and says so on screen.

## Fonts

The live demo uses Whop's licensed typefaces. Those files are not redistributed here, so this copy falls back to system fonts and will look a little different. Add your own files to `public/fonts` and matching `@font-face` rules in `app/globals.css` if you want to change that.
