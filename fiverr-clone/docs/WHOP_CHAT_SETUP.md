# Whop Chat Setup

What’s needed to use [Whop’s embedded chat](https://docs.whop.com/developer/guides/chat/quickstart) in this app.

## 1. Install the SDK (with Chat support)

The quickstart uses `ChatElement`, `ChatSession`, and `Elements` from the embedded components:

```bash
npm install @whop/embedded-components-react-js @whop/embedded-components-vanilla-js
```

- **Current:** We use `0.0.13-beta.10`, which exports **Chat** (`ChatElement`, `ChatSession`, `DmsListElement`). The app uses them in `WhopChatEmbed` and `ChatPanel`.
- **Stable:** When a stable release includes Chat, you can switch back to `^0.0.x`.

```tsx
import { ChatElement, ChatSession, Elements } from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
```

## 2. Authentication (token endpoint)

Per [Whop Chat Authentication](https://docs.whop.com/developer/guides/chat/authentication) and [Create access token](https://docs.whop.com/api-reference/access-tokens/create-access-token): the token endpoint can return **either** an OAuth access token **or** a token from Create Access Token (API key + `company_id` or `user_id`). Both work with embedded components — **OAuth is not required** when we can issue a token via the API.

The embed calls **`GET /api/token`** (implemented by `src/app/api/chat/token/route.ts`; the route at `src/app/api/token/route.ts` is an alias so the quickstart’s `fetch("/api/token")` works). Token logic runs in this order:

1. **Create Access Token with `user_id`** — if profile has `whop_user_id`, call the API with API key + `user_id` and chat scopes; **no OAuth needed** (preferred for embed).
2. **Create Access Token with `company_id`** — for sellers with `whop_company_id`; **no OAuth needed**.
3. **OAuth refresh** — fallback if profile has `whop_refresh_token`.

So once a user has `whop_user_id` (e.g. from linking once or from another flow), we can issue a chat token without OAuth. Sellers with `whop_company_id` always get a company-scoped token without linking.

Required scopes for chat: `chat:read`, `chat:message:create`, `dms:read`, `dms:message:manage`, `dms:channel:manage`, `support_chat:read`, `support_chat:message:create`.

- Whop OAuth callback at `/api/auth/callback/whop` stores `whop_refresh_token` and `whop_user_id`. It is used for both **login** (via `/api/auth/whop/authorize`) and **link** (via `/api/auth/whop/link`). Both flows must request the same full scopes (including chat/DM/support_chat) so that chat works after login or link.
- **Create OAuth app via API (full control):** Run `node scripts/create-whop-oauth-app.js`. Requires `WHOP_API_KEY` and `WHOP_PLATFORM_COMPANY_ID` in `.env.local`. The script creates a new Whop app (or updates redirect URIs if `WHOP_OAUTH_CLIENT_ID` is set) and prints the env vars to add (`WHOP_OAUTH_CLIENT_ID`, `WHOP_OAUTH_CLIENT_SECRET` if returned, `NEXT_PUBLIC_WHOP_OAUTH_REDIRECT_URI`). In Whop Dashboard → Developer → App → OAuth, ensure the same redirect URI and scopes (openid, profile, email, chat:*, dms:*, support_chat:*) are enabled.
- If the API key does not have permission to create a token for a given `user_id`, we fall back to seller company token or 403.

## 3. Create a Whop DM channel

To show a conversation in Whop chat you need a **channel ID**. We use a **DM channel** by default (direct message between buyer and seller).

- We have `GET /api/conversations/[id]/whop-channel`, which calls [Create DM channel](https://docs.whop.com/api-reference/dm-channels/create-dm-channel) with:
  - `company_id`: optional, seller’s Whop company when both users have Whop IDs
  - `with_user_ids`: seller and buyer Whop user IDs (or buyer email if only one has linked Whop)
  - `custom_name`: optional (e.g. "Gig conversation")

Both buyer and seller must be identifiable (Whop account linked in Account Settings, or buyer email).

**Company vs App API key:** The app uses **`WHOP_API_KEY`** everywhere (checkout, sell, payouts, chat). That’s usually a **Company API key** from your platform company. Create DM channel requires **`dms:channel:manage`**. If your **Company API key** doesn’t allow that permission in the dashboard, you need an **App API key** for chat:

- **Company API key** – Developer → API Keys → Create (your own company). Use for payments, KYC, payouts. May not list DM permissions.
- **App API key** – Developer → Create app → use the app’s API key (Environment variables). Use when you need DM/chat: Create DM channel accepts “company API key, app API key, or user OAuth token.”

**What to do:** First try adding **dms:channel:manage** (and **dms:read**, **dms:message:manage**) to your existing Company key in [Whop Dashboard](https://whop.com/dashboard/) → Developer → API Keys → your key → Permissions. If that permission isn’t available for Company keys, create an App (Developer → Create app), copy the app’s API key, and set **`WHOP_APP_API_KEY`** in `.env.local`. The whop-channel route uses **`WHOP_APP_API_KEY`** when set, otherwise **`WHOP_API_KEY`**, so you can keep one key for payments and use the app key only for chat/DM.

## 4. Display the chat

Once you have:

- A token endpoint that returns a **user** OAuth token (see §2), and  
- A `channelId` (from §3),

you can render Whop chat as in the quickstart:

```tsx
const elements = loadWhopElements();

async function getToken() {
  const response = await fetch("/api/token");  // alias of /api/chat/token
  const data = await response.json();
  return data.token;
}

<Elements elements={elements}>
  <ChatSession token={getToken}>
    <ChatElement
      options={{ channelId: "chat_XXXXXXXXXXXXXX" }}
      style={{ height: "100dvh", width: "100%" }}
    />
  </ChatSession>
</Elements>
```

When token and channelId are available (user linked or seller company + both sides with Whop identity), the embed is used; otherwise the app falls back to Supabase messages.

## Chat not loading after “Login with Whop”?

For Whop chat to show in a conversation, all of the following must be true:

1. **Your profile has Whop data**  
   Login with Whop (or “Link Whop” in Account Settings) stores `whop_user_id` and `whop_refresh_token` on your profile. If you signed in with email only, link Whop once in **Account → Settings** so chat can get a token.

2. **Token endpoint works**  
   The embed calls `GET /api/token` (implemented by `/api/chat/token`), which uses your `whop_refresh_token` (with OAuth client ID/secret) or Create Access Token. Ensure `.env.local` has `WHOP_OAUTH_CLIENT_ID` and `WHOP_OAUTH_CLIENT_SECRET` (for OAuth path) and the app has been restarted. If the token call returns 401/403, the UI falls back to Supabase messages.

3. **A Whop channel exists for the conversation**  
   The app calls `GET /api/conversations/[id]/whop-channel` to get or create a Whop DM channel. That requires:
   - **Seller** has a Whop company (`whop_company_id` on their seller account) and ideally a linked Whop user (`whop_user_id` on their profile).
   - **Buyer** is identifiable in Whop: either `whop_user_id` on profile (e.g. from “Login with Whop”) or an email that matches a Whop user.
   - If the channel cannot be created (e.g. “Both users must link their Whop account”), you’ll see that message and Supabase chat instead.

4. **Env and dashboard**  
   `WHOP_API_KEY` must be set for channel creation and for Create Access Token fallbacks. In Whop Dashboard → Developer → your app → OAuth, the same redirect URI and scopes (including chat/DM) must be enabled.

If chat still doesn’t load, open the browser Network tab and check: (1) **`/api/token`** (or `/api/chat/token`) — 200 with `{ "token": "..." }`; (2) **`/api/conversations/.../whop-channel`** — 200 with `{ "channelId": "..." }`. Any 401/403/502 there explains the fallback to Supabase messages.

## Environment checklist

| Variable | Purpose |
|--------|---------|
| `WHOP_API_KEY` | Token (Create Access Token) and channel create; Company key. |
| `WHOP_APP_API_KEY` | Optional; used for channel create when set (if Company key lacks `dms:channel:manage`). |
| `WHOP_OAUTH_CLIENT_ID` | OAuth path for token (refresh). |
| `WHOP_OAUTH_CLIENT_SECRET` | OAuth path for token (refresh). |
| `NEXT_PUBLIC_WHOP_OAUTH_REDIRECT_URI` | Must match Whop Dashboard (e.g. `https://your-app.com/api/auth/callback/whop`). |
| `NEXT_PUBLIC_WHOP_ENVIRONMENT` | Optional; `production` (default) or `sandbox` for `loadWhopElements`. |

## Rebuild checklist (when changing chat)

When touching Whop chat, ensure:

- **Token:** `GET /api/chat/token` returns `{ token: string }` on success; alias at `/api/token` is used by the embed.
- **Channel:** `GET /api/conversations/[id]/whop-channel` returns `{ channelId, name }`; both users identifiable (linked Whop or buyer email); API key has `dms:channel:manage` or use `WHOP_APP_API_KEY`.
- **Frontend:** `WhopChatEmbed` calls `onAuthRequired?.()` on token failure so `ChatPanel` sets `useWhop(false)` and shows Supabase messages.
- **OAuth:** Authorize and link routes request chat/DM scopes; Dashboard redirect URI and scopes match.

## Summary

| Requirement              | Status |
|--------------------------|--------|
| SDK with ChatElement     | Using 0.0.13-beta+ with Chat |
| Token                    | OAuth refresh, or Create Access Token (user_id or company_id) — OAuth not required when we have whop_user_id or company |
| Channel ID (DM)          | API exists; both users need Whop identity for DMs |
| Frontend ChatElement     | Ready; WhopChatEmbed in ChatPanel |

Refs: [Chat quickstart](https://docs.whop.com/developer/guides/chat/quickstart), [Chat authentication](https://docs.whop.com/developer/guides/chat/authentication), [Chat element](https://docs.whop.com/developer/guides/chat/chat-element).
