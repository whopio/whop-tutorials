# Paid Chrome Extension Tutorial (LLM Context)

Condensed reference for building a paid Chrome extension on Whop. The extension is a dumb client; a Next.js app is the trusted backend; Whop is the system of record for login, payments, billing, and access. Non-obvious code (the OAuth/PKCE service worker, the server access checks, the entitlement resolver, CORS, the webhook handler, the checkout embed, the manifest) is included in full. Standard DOM/React UI is described in prose.

---

## 1. Overview

**Product:** a Manifest V3 Chrome extension whose premium feature unlocks only after Whop confirms the signed-in user has paid. The extension popup handles login and checkout handoff; a Next.js API verifies access against Whop on every gated call; Whop owns identity, the checkout, the billing portal, and webhooks.

**Architecture (the whole point):** the extension never decides access on its own. It holds a Whop OAuth token, sends it to the Next.js server, and the server re-checks the user's membership with Whop before returning anything paid. A cached entitlement snapshot drives the popup UI, but it is never the security boundary.

**Business model:** subscription (or one-time) sold through Whop checkout. The server gates a "premium feature" behind a configured Whop resource ID.

**Tech stack**

| Category | Technology |
|----------|-----------|
| Monorepo | pnpm workspace: `apps/web` (Next.js) + `extension` (Vite) |
| Backend | Next.js 16 (App Router, webpack), React 19 |
| Extension | Manifest V3, TypeScript, Vite 7 build, vanilla DOM popup/options |
| Auth | Whop OAuth 2.1 via Chrome `identity.launchWebAuthFlow`, PKCE (S256) + `state` + `nonce`, public client (no client secret) |
| Access | Whop `GET /api/v1/users/{id}/access/{resourceId}` re-checked server-side per request |
| Payments | Whop checkout: embedded `@whop/checkout` (`<WhopCheckoutEmbed>`) or hosted checkout link |
| Billing | Whop memberships `manage_url` (hosted billing portal) |
| Webhooks | `@whop/sdk` `webhooks.unwrap` signature verification |
| Storage | `chrome.storage.local` (tokens, entitlement snapshot, runtime config) |
| Validation | none required (no DB); env read through a typed reader |
| Deployment | Vercel (web app) + Chrome Web Store (extension) |

No database. Access is authoritative at request time, so the starter ships without persistence; webhooks are wired and verified but only logged.

**Pages (web app, `apps/web/app`)**

- `/`: marketing landing for the starter (described).
- `/checkout`: renders the Whop checkout embed gated on `WHOP_PLAN_ID`, with a hosted-checkout fallback link.
- `/checkout/complete`: post-purchase confirmation (described).
- `/demo`, `/docs`: in-app demo of the gate states and setup docs (described).

**Extension surfaces (`extension/`)**

- Popup (`popup.html` + `src/popup.ts`): account panel, access/gate panel, result panel. Login, Sign up, Refresh, Manage billing, Logout.
- Options page (`options.html` + `src/options.ts`): runtime config form (API base URL, OAuth client id, resource id, scope, mock-mode toggle).
- Background service worker (`src/background.ts`): the OAuth flow, token refresh, and the message router the popup talks to.

**API routes (`apps/web/app/api`)**

- `POST /api/extension/entitlements`: the main access endpoint. Resolves the bearer token to an `EntitlementSnapshot`.
- `POST /api/extension/gated-resource`: the protected feature. Returns `402` when the user has no access.
- `POST /api/extension/billing-portal`: returns the user's Whop billing-management URL.
- `GET /api/extension/config`: public config (app name, checkout URL, mock mode, OAuth client id/scope/resource id).
- `POST /api/webhooks/whop`: verifies the Whop webhook signature and logs the event.
- `GET /api/health`: liveness check (described).

**End-to-end flow**

1. User opens the popup. The background worker answers `GET_STATE` from `chrome.storage.local` (tokens, entitlement, config), and the popup renders signed-out (Login + Sign up) or signed-in.
2. Sign up opens the Whop checkout URL in a new tab. The `/checkout` page renders `<WhopCheckoutEmbed>` (or links to hosted checkout), and the user pays.
3. Login runs Chrome's `launchWebAuthFlow` against Whop `/oauth/authorize` with PKCE (S256), `state`, and `nonce`. The worker exchanges the code at `/oauth/token` with a JSON body and no client secret (public client), then stores the tokens.
4. The worker calls `POST /api/extension/entitlements` with the user's bearer token. The server reads `/oauth/userinfo` for the `sub`, then `GET /api/v1/users/{sub}/access/{resourceId}` (App API key first, user token as fallback), and returns an `EntitlementSnapshot`.
5. The popup unlocks the gate when `hasAccess` is true. A gated action calls `POST /api/extension/gated-resource`, which re-resolves access server-side and returns `402` if the user is not entitled.
6. Manage billing calls `POST /api/extension/billing-portal`. The server finds the active membership's `manage_url` and the popup opens Whop's hosted billing.
7. Whop posts webhooks to `/api/webhooks/whop`. The handler verifies the signature and logs the event. Because access is re-checked live, persistence is optional.

---

## 2. Setup

### Monorepo

A pnpm workspace with two packages: `apps/web` (the Next.js backend + checkout pages) and `extension` (the Manifest V3 client). Install once from the root with `pnpm install`. The web app runs on **port 3001**; the manifest and extension env point at `http://localhost:3001`.

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "extension"
```

Root `package.json` (scripts are what you run day to day):

```json
{
  "name": "whop-chrome-extension-template",
  "private": true,
  "packageManager": "pnpm@9.15.9",
  "scripts": {
    "dev:web": "pnpm --filter @whop-extension-template/web dev",
    "dev:extension": "pnpm --filter @whop-extension-template/extension dev",
    "build": "pnpm -r build",
    "build:web": "pnpm --filter @whop-extension-template/web build",
    "build:extension": "pnpm --filter @whop-extension-template/extension build",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint"
  },
  "engines": { "node": "22.x" }
}
```

`apps/web/package.json`:

```json
{
  "name": "@whop-extension-template/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --webpack -p 3001",
    "build": "next build --webpack",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "@whop/checkout": "^0.0.52",
    "@whop/sdk": "^0.0.39",
    "next": "^16.2.6",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.19.19",
    "@types/react": "^19.2.15",
    "@types/react-dom": "^19.2.3",
    "eslint": "^9.39.4",
    "eslint-config-next": "^16.2.6",
    "typescript": "^6.0.3"
  },
  "engines": { "node": "22.x" }
}
```

`extension/package.json` (Vite builds the MV3 bundle; `dev` rebuilds on change):

```json
{
  "name": "@whop-extension-template/extension",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/chrome": "^0.1.42",
    "typescript": "^6.0.3",
    "vite": "^7.3.3"
  },
  "engines": { "node": "22.x" }
}
```

TypeScript: the web app uses a standard Next.js `tsconfig.json` with a `"@/*": ["./*"]` path alias (every route and lib import relies on it). The extension `tsconfig.json` adds `"types": ["chrome"]` so `chrome.identity`, `chrome.storage`, and `chrome.runtime` type-check, and `extension/src/vite-env.d.ts` is one line: `/// <reference types="vite/client" />`.

### Web app security headers — `apps/web/next.config.ts`

```ts
import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()"
  }
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  }
};

export default nextConfig;
```

`frame-ancestors 'none'` is correct and does not block the Whop checkout embed: the app is the parent frame, not the embedded child.

### Extension build — `extension/vite.config.ts`

Three inputs (the service worker plus the two HTML pages). `entryFileNames: "assets/[name].js"` is what produces the `assets/background.js` path the manifest references.

```ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        background: "src/background.ts",
        popup: "popup.html",
        options: "options.html"
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  }
});
```

### Whop dashboard setup

1. Create a Whop app in the dashboard's Developer section. Note the **App ID** (`app_…`) and create an **App API key** (`apik_…`).
2. Enable the `oauth:token_exchange` permission on the app. The extension is a **public OAuth client**: it sends no client secret, only PKCE. (Server-side Whop apps need a client secret; a Chrome extension does not.)
3. Create the product/plan you are gating. `WHOP_ACCESS_RESOURCE_ID` is the product/experience id (`prod_…`); `WHOP_PLAN_ID` is the plan the checkout opens (`plan_…`).
4. Add the OAuth redirect URI `https://<extension-id>.chromiumapp.org/whop`. In dev, `<extension-id>` is the unpacked id Chrome assigns; in production it is the published Web Store id.
5. Create a company-level webhook pointing at `https://<your-domain>/api/webhooks/whop` and copy the signing secret to `WHOP_WEBHOOK_SECRET`.

### Environment variables

`apps/web/.env.local` (server-only secrets are `WHOP_API_KEY` and `WHOP_WEBHOOK_SECRET`):

```text
NEXT_PUBLIC_APP_URL=http://localhost:3001
EXTENSION_ALLOWED_ORIGINS=*

NEXT_PUBLIC_WHOP_APP_ID=app_...
WHOP_ACCESS_RESOURCE_ID=prod_...
WHOP_COMPANY_ID=biz_...
WHOP_PLAN_ID=plan_...
WHOP_API_KEY=apik_...
WHOP_WEBHOOK_SECRET=...

WHOP_MOCK_MODE=false
WHOP_ALLOW_FREE_ACCESS=false
WHOP_BILLING_PORTAL_FALLBACK_URL=https://whop.com/@me/settings/memberships/
```

`extension/.env` (compiled into the bundle by Vite, so it is public — never put secrets here):

```text
VITE_API_BASE_URL=http://localhost:3001
VITE_CHECKOUT_URL=http://localhost:3001/checkout?source=extension
VITE_WHOP_CLIENT_ID=app_...
VITE_WHOP_ACCESS_RESOURCE_ID=prod_...
VITE_WHOP_OAUTH_SCOPE=openid profile email
VITE_MOCK_MODE=false
```

`EXTENSION_ALLOWED_ORIGINS=*` is a dev convenience; in production set it to `chrome-extension://<published-id>` (the CORS helper ignores `*` when `NODE_ENV=production`). `WHOP_MOCK_MODE` and `WHOP_ALLOW_FREE_ACCESS` default to `false` and the server refuses to boot with mock mode on in production.

---

## 3. Shared extension modules

The popup and the background worker share three small modules.

### `extension/src/shared/types.ts`

The contract between popup and background, including the `RuntimeMessage` union that types the message protocol.

```ts
export type RuntimeConfig = {
  apiBaseUrl: string;
  checkoutUrl: string;
  whopClientId: string;
  whopResourceId: string;
  oauthScope: string;
  mockMode: boolean;
};

export type WhopTokens = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  obtained_at: number;
};

export type ExtensionUser = {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  picture?: string;
};

export type EntitlementSnapshot = {
  hasAccess: boolean;
  accessLevel: "no_access" | "customer" | "admin";
  tier: "free" | "premium" | "admin";
  source: "mock" | "whop-api-key" | "whop-user-token";
  checkedAt: string;
  expiresAt: string;
  checkoutUrl: string;
  billingPortalUrl?: string;
  features: string[];
  user?: ExtensionUser;
  error?: string;
};

export type ExtensionState = {
  signedIn: boolean;
  user?: ExtensionUser;
  entitlement?: EntitlementSnapshot;
  config: RuntimeConfig;
};

export type RuntimeMessage =
  | { type: "GET_STATE" }
  | { type: "SIGN_IN"; mockTier?: "free" | "premium" | "admin" }
  | { type: "LOG_OUT" }
  | { type: "REFRESH_ENTITLEMENT" }
  | { type: "GET_BILLING_PORTAL" }
  | { type: "GET_GATED_RESOURCE" };
```

### `extension/src/shared/storage.ts`

Tokens, the entitlement snapshot, and the user live in `chrome.storage.local`. This is unencrypted on disk; the refresh token persists in cleartext until logout calls `clearAuthStorage`. That is standard for extensions, but never store anything here you would not put in a cookie.

```ts
import type { EntitlementSnapshot, ExtensionUser, WhopTokens } from "./types";

const TOKEN_KEY = "whopTokens";
const ENTITLEMENT_KEY = "entitlementSnapshot";
const USER_KEY = "extensionUser";

export async function getTokens() {
  const result = await chrome.storage.local.get(TOKEN_KEY);
  return result[TOKEN_KEY] as WhopTokens | undefined;
}

export async function setTokens(tokens: WhopTokens) {
  await chrome.storage.local.set({ [TOKEN_KEY]: tokens });
}

export async function getEntitlement() {
  const result = await chrome.storage.local.get(ENTITLEMENT_KEY);
  return result[ENTITLEMENT_KEY] as EntitlementSnapshot | undefined;
}

export async function setEntitlement(entitlement: EntitlementSnapshot) {
  await chrome.storage.local.set({ [ENTITLEMENT_KEY]: entitlement });
}

export async function getStoredUser() {
  const result = await chrome.storage.local.get(USER_KEY);
  return result[USER_KEY] as ExtensionUser | undefined;
}

export async function setStoredUser(user: ExtensionUser) {
  await chrome.storage.local.set({ [USER_KEY]: user });
}

export async function clearAuthStorage() {
  await chrome.storage.local.remove([TOKEN_KEY, ENTITLEMENT_KEY, USER_KEY]);
}
```

### `extension/src/shared/config.ts`

Merges the compiled Vite env values with any overrides the user saved from the options page.

```ts
import type { RuntimeConfig } from "./types";

export const DEFAULT_CONFIG: RuntimeConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  checkoutUrl:
    import.meta.env.VITE_CHECKOUT_URL ||
    "http://localhost:3000/checkout?source=extension",
  whopClientId: import.meta.env.VITE_WHOP_CLIENT_ID || "",
  whopResourceId:
    import.meta.env.VITE_WHOP_ACCESS_RESOURCE_ID ||
    import.meta.env.VITE_WHOP_RESOURCE_ID ||
    "",
  oauthScope: import.meta.env.VITE_WHOP_OAUTH_SCOPE || "openid profile email",
  mockMode: (import.meta.env.VITE_MOCK_MODE || "true") === "true"
};

const CONFIG_KEY = "runtimeConfig";

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const stored = await chrome.storage.local.get(CONFIG_KEY);
  return { ...DEFAULT_CONFIG, ...(stored[CONFIG_KEY] || {}) };
}

export async function saveRuntimeConfig(config: RuntimeConfig) {
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
}

export async function resetRuntimeConfig() {
  await chrome.storage.local.remove(CONFIG_KEY);
}
```

---

## 4. Extension OAuth + PKCE — `extension/src/background.ts`

The service worker is the only place that touches Whop OAuth. It exposes a message router to the popup (`GET_STATE`, `SIGN_IN`, `LOG_OUT`, `REFRESH_ENTITLEMENT`, `GET_BILLING_PORTAL`, `GET_GATED_RESOURCE`), runs the PKCE login through `chrome.identity.launchWebAuthFlow`, refreshes tokens before they expire, and proxies the three authenticated calls to the Next.js API with the user's bearer token. Keep this file in full — the PKCE and refresh sequencing is exactly what an LLM tends to get wrong.

Three details that matter: the token exchange uses a **JSON body** (Whop rejects form-encoded), the extension sends **no client secret** (public client), and `state` is verified on the callback. The `nonce` is required because the scope includes `openid`; the worker does not validate the returned `id_token` because the server independently re-fetches `/oauth/userinfo`.

```ts
import { getRuntimeConfig } from "./shared/config";
import {
  clearAuthStorage,
  getEntitlement,
  getStoredUser,
  getTokens,
  setEntitlement,
  setStoredUser,
  setTokens
} from "./shared/storage";
import type {
  EntitlementSnapshot,
  ExtensionState,
  ExtensionUser,
  RuntimeConfig,
  RuntimeMessage,
  WhopTokens
} from "./shared/types";

const WHOP_OAUTH_BASE = "https://api.whop.com/oauth";
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

type WhopTokenPayload = Partial<Omit<WhopTokens, "obtained_at">>;
type PremiumActionPayload = {
  ok?: boolean;
  message?: string;
  entitlement?: EntitlementSnapshot;
  resource?: unknown;
};
type BillingPortalPayload = {
  url?: string;
  message?: string;
};

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then((payload) => sendResponse({ ok: true, payload }))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected extension error"
      })
    );

  return true;
});

async function handleMessage(message: RuntimeMessage) {
  switch (message.type) {
    case "GET_STATE":
      return getState();
    case "SIGN_IN":
      return signIn(message.mockTier);
    case "LOG_OUT":
      await clearAuthStorage();
      return getState();
    case "REFRESH_ENTITLEMENT":
      return refreshEntitlement();
    case "GET_BILLING_PORTAL":
      return getBillingPortal();
    case "GET_GATED_RESOURCE":
      return getGatedResource();
    default:
      throw new Error("Unknown runtime message");
  }
}

async function getState(): Promise<ExtensionState> {
  const [config, tokens, entitlement, storedUser] = await Promise.all([
    getRuntimeConfig(),
    getTokens(),
    getEntitlement(),
    getStoredUser()
  ]);

  return {
    signedIn: Boolean(tokens),
    user: entitlement?.user || storedUser,
    entitlement,
    config
  };
}

async function signIn(mockTier?: "free" | "premium" | "admin") {
  const config = await getRuntimeConfig();

  if (config.mockMode && (mockTier || !config.whopClientId)) {
    await createMockSession(mockTier || "premium");
    return refreshEntitlement();
  }

  if (!config.whopClientId) {
    throw new Error("Add a Whop OAuth app id in the extension options page.");
  }

  const tokens = await startWhopOAuth(config);
  await setTokens(tokens);

  const user = await fetchWhopUserInfo(tokens.access_token);
  await setStoredUser(user);

  return refreshEntitlement();
}

async function createMockSession(tier: "free" | "premium" | "admin") {
  const now = Date.now();
  await setTokens({
    access_token: `mock-${tier}`,
    refresh_token: `mock-refresh-${tier}`,
    token_type: "Bearer",
    expires_in: 60 * 60,
    obtained_at: now
  });
  await setStoredUser({
    id: `user_mock_${tier}`,
    name: tier === "free" ? "Mock Free User" : "Mock Premium User",
    username: tier,
    email: `${tier}@example.test`
  });
}

async function startWhopOAuth(config: RuntimeConfig): Promise<WhopTokens> {
  const redirectUri = chrome.identity.getRedirectURL("whop");
  const pkce = {
    codeVerifier: randomString(64),
    state: randomString(24),
    // openid scope requires a nonce on the authorize request; we don't validate the
    // returned id_token here because the server re-fetches userinfo (the trust boundary)
    nonce: randomString(24)
  };

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.whopClientId,
    redirect_uri: redirectUri,
    scope: config.oauthScope,
    state: pkce.state,
    nonce: pkce.nonce,
    code_challenge: await sha256(pkce.codeVerifier),
    code_challenge_method: "S256"
  });

  let finalUrl: string | undefined;
  try {
    finalUrl = await chrome.identity.launchWebAuthFlow({
      url: `${WHOP_OAUTH_BASE}/authorize?${params.toString()}`,
      interactive: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open Whop OAuth.";
    throw new Error(
      `${message} Add this redirect URI to your Whop OAuth app, then reload the extension: ${redirectUri}`
    );
  }

  if (!finalUrl) {
    throw new Error("Whop sign-in did not return a redirect URL.");
  }

  const callbackUrl = new URL(finalUrl);
  const error = callbackUrl.searchParams.get("error");
  if (error) {
    throw new Error(
      callbackUrl.searchParams.get("error_description") || `Whop OAuth error: ${error}`
    );
  }

  const code = callbackUrl.searchParams.get("code");
  const returnedState = callbackUrl.searchParams.get("state");
  if (!code || returnedState !== pkce.state) {
    throw new Error("Invalid Whop OAuth callback state.");
  }

  const response = await fetch(`${WHOP_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.whopClientId,
      code_verifier: pkce.codeVerifier
    })
  });

  if (!response.ok) {
    throw new Error(`Whop token exchange failed with ${response.status}`);
  }

  return normalizeTokens(await readJson<WhopTokenPayload>(response));
}

async function getValidAccessToken() {
  const tokens = await getTokens();
  const config = await getRuntimeConfig();

  if (!tokens) {
    throw new Error("Sign in with Whop first.");
  }

  if (tokens.access_token.startsWith("mock-")) {
    return tokens.access_token;
  }

  const expiresAt = tokens.obtained_at + tokens.expires_in * 1000;
  if (Date.now() < expiresAt - REFRESH_BUFFER_MS) {
    return tokens.access_token;
  }

  if (!tokens.refresh_token) {
    throw new Error("Whop session expired. Please sign in again.");
  }

  const response = await fetch(`${WHOP_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: config.whopClientId
    })
  });

  if (!response.ok) {
    await clearAuthStorage();
    throw new Error("Whop session expired. Please sign in again.");
  }

  const refreshed = normalizeTokens(
    await readJson<WhopTokenPayload>(response),
    tokens.refresh_token
  );
  await setTokens(refreshed);
  return refreshed.access_token;
}

async function fetchWhopUserInfo(accessToken: string): Promise<ExtensionUser> {
  if (accessToken.startsWith("mock-")) {
    const tier = accessToken.replace("mock-", "");
    return {
      id: `user_mock_${tier}`,
      name: tier === "free" ? "Mock Free User" : "Mock Premium User",
      username: tier,
      email: `${tier}@example.test`
    };
  }

  const response = await fetch(`${WHOP_OAUTH_BASE}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch Whop user info (${response.status}).`);
  }

  const user = (await response.json()) as {
    sub: string;
    name?: string;
    preferred_username?: string;
    email?: string;
    picture?: string;
  };

  return {
    id: user.sub,
    name: user.name,
    username: user.preferred_username,
    email: user.email,
    picture: user.picture
  };
}

async function refreshEntitlement() {
  const config = await getRuntimeConfig();
  const token = await getValidAccessToken();
  const response = await fetch(`${config.apiBaseUrl}/api/extension/entitlements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Extension-Version": chrome.runtime.getManifest().version
    },
    body: JSON.stringify({
      extensionId: chrome.runtime.id,
      resourceId: config.whopResourceId
    })
  });

  const entitlement = await readJson<EntitlementSnapshot>(response);
  if (!entitlement) {
    throw new Error(`Entitlement check returned invalid JSON (${response.status}).`);
  }

  if (!response.ok && !entitlement.error) {
    throw new Error(`Entitlement check failed with ${response.status}`);
  }

  await setEntitlement(entitlement);
  if (entitlement.user) await setStoredUser(entitlement.user);

  return entitlement;
}

async function getBillingPortal() {
  const config = await getRuntimeConfig();
  const token = await getValidAccessToken();
  const response = await fetch(`${config.apiBaseUrl}/api/extension/billing-portal`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Extension-Version": chrome.runtime.getManifest().version
    }
  });

  const payload = await readJson<BillingPortalPayload>(response);
  if (!payload?.url) {
    throw new Error(payload?.message || `Billing portal lookup failed with ${response.status}`);
  }

  return payload;
}

async function getGatedResource() {
  const config = await getRuntimeConfig();
  const token = await getValidAccessToken();
  const response = await fetch(`${config.apiBaseUrl}/api/extension/gated-resource`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Extension-Version": chrome.runtime.getManifest().version
    }
  });

  const payload = await readJson<PremiumActionPayload>(response);
  if (!payload) {
    throw new Error(`Gated resource returned invalid JSON (${response.status}).`);
  }

  if (response.status === 402) {
    if (payload.entitlement) await setEntitlement(payload.entitlement);
    return payload;
  }

  if (!response.ok) {
    throw new Error(payload.message || `Gated resource failed with ${response.status}`);
  }

  if (payload.entitlement) await setEntitlement(payload.entitlement);
  return payload;
}

async function readJson<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

function normalizeTokens(
  payload: WhopTokenPayload | undefined,
  fallbackRefreshToken?: string
): WhopTokens {
  if (
    !payload?.access_token ||
    !payload.token_type ||
    typeof payload.expires_in !== "number" ||
    !Number.isFinite(payload.expires_in)
  ) {
    throw new Error("Whop token response was incomplete.");
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || fallbackRefreshToken,
    id_token: payload.id_token,
    token_type: payload.token_type,
    expires_in: Math.max(0, Math.trunc(payload.expires_in)),
    obtained_at: Date.now()
  };
}

function base64url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(length: number) {
  return base64url(crypto.getRandomValues(new Uint8Array(length)));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return base64url(new Uint8Array(digest));
}
```

---

## 5. Web app foundations

### `apps/web/lib/env.ts`

A typed reader for every server env var. Mock mode is opt-in and cannot run in production (the server throws on boot if it is on), and free access defaults to off.

```ts
function readEnv(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function readBoolean(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getServerEnv() {
  const whopApiKey = readEnv("WHOP_API_KEY");
  const mockMode = readBoolean("WHOP_MOCK_MODE", false);

  if (mockMode && process.env.NODE_ENV === "production") {
    throw new Error(
      "WHOP_MOCK_MODE must be disabled in production. Remove it or set it to false."
    );
  }

  return {
    publicAppUrl: readEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    whopAppId: readEnv("NEXT_PUBLIC_WHOP_APP_ID"),
    whopResourceId: readEnv("WHOP_ACCESS_RESOURCE_ID") || readEnv("WHOP_RESOURCE_ID"),
    whopCompanyId: readEnv("WHOP_COMPANY_ID") || readEnv("WHOP_BUSINESS_ID"),
    whopPlanId: readEnv("WHOP_PLAN_ID"),
    whopApiKey,
    mockMode,
    allowFreeAccess: readBoolean("WHOP_ALLOW_FREE_ACCESS", false),
    billingPortalFallbackUrl: readEnv(
      "WHOP_BILLING_PORTAL_FALLBACK_URL",
      "https://whop.com/@me/settings/memberships/"
    )
  };
}

export function getCheckoutUrl() {
  const env = getServerEnv();
  if (!env.whopPlanId) {
    return `${env.publicAppUrl}/checkout`;
  }

  return `https://whop.com/checkout/${env.whopPlanId}`;
}
```

### `apps/web/lib/types.ts`

```ts
export type AccessLevel = "no_access" | "customer" | "admin";
export type EntitlementTier = "free" | "premium" | "admin";

export type EntitlementSnapshot = {
  hasAccess: boolean;
  accessLevel: AccessLevel;
  tier: EntitlementTier;
  source: "mock" | "whop-api-key" | "whop-user-token";
  checkedAt: string;
  expiresAt: string;
  checkoutUrl: string;
  billingPortalUrl?: string;
  features: string[];
  user?: {
    id: string;
    name?: string;
    username?: string;
    email?: string;
    picture?: string;
  };
};
```

### `apps/web/lib/plans.ts`

The free vs premium feature lists the entitlement resolver returns. Replace these with your real feature flags.

```ts
export const DEMO_PRODUCT = {
  name: "Whop Chrome Extension Starter",
  description:
    "A production-minded template for Chrome extension founders who want Whop login, checkout, billing, and premium access gating without building subscription plumbing from scratch."
};

export const FREE_FEATURES = [
  "whop_oauth_login",
  "checkout_link",
  "free_extension_shell"
];

export const PREMIUM_FEATURES = [
  ...FREE_FEATURES,
  "server_verified_access",
  "billing_portal",
  "premium_feature_unlock",
  "webhook_ready_backend"
];
```

---

## 6. Talk to Whop from the server — `apps/web/lib/whop.ts`

The server-side Whop client. `fetchWhopUserInfo` resolves an OAuth token to its `sub`; `checkWhopAccess` calls Whop's check-access endpoint; `findBillingPortalUrl` finds the active membership's hosted billing link. Each access call tries the App API key first and falls back to the user's own token (logging the fallback so a dead key is visible), and every outbound call has an 8s timeout. The access answer comes from Whop's backend off the user's real memberships, so it is honest regardless of which token asks.

```ts
import { getServerEnv } from "./env";
import type { AccessLevel } from "./types";

const WHOP_API_BASE = "https://api.whop.com";

export type WhopUserInfo = {
  sub: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
};

export type WhopAccessResponse = {
  has_access: boolean;
  access_level: AccessLevel;
  source?: "whop-api-key" | "whop-user-token";
};

export type WhopMembership = {
  id: string;
  status?: string;
  manage_url?: string | null;
  user?: { id?: string };
  product?: { id?: string };
  plan?: { id?: string };
};

export class WhopApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function parseWhopResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new WhopApiError(
      `Whop API request failed with ${response.status}${errorBody ? `: ${errorBody}` : ""}`,
      response.status
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchWhopUserInfo(accessToken: string) {
  const response = await fetch(`${WHOP_API_BASE}/oauth/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000)
  });

  return parseWhopResponse<WhopUserInfo>(response);
}

export async function checkWhopAccess({
  userId,
  userAccessToken
}: {
  userId: string;
  userAccessToken: string;
}) {
  const env = getServerEnv();
  const resourceId = env.whopResourceId;

  async function requestAccess(
    authToken: string,
    source: NonNullable<WhopAccessResponse["source"]>
  ) {
    const response = await fetch(
      `${WHOP_API_BASE}/api/v1/users/${encodeURIComponent(userId)}/access/${encodeURIComponent(resourceId)}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000)
      }
    );

    const access = await parseWhopResponse<WhopAccessResponse>(response);
    return { ...access, source };
  }

  if (env.whopApiKey) {
    try {
      return await requestAccess(env.whopApiKey, "whop-api-key");
    } catch (error) {
      if (!(error instanceof WhopApiError) || ![401, 403].includes(error.status)) {
        throw error;
      }
      console.error(
        `Whop API key rejected on access check (${error.status}). Falling back to the user token; check WHOP_API_KEY.`
      );
    }
  }

  return requestAccess(userAccessToken, "whop-user-token");
}

export async function findBillingPortalUrl({
  userId,
  userAccessToken
}: {
  userId: string;
  userAccessToken: string;
}) {
  const env = getServerEnv();
  const params = new URLSearchParams({
    first: "10",
    user_ids: userId
  });

  if (env.whopCompanyId) {
    params.set("company_id", env.whopCompanyId);
  }

  if (env.whopResourceId.startsWith("prod_")) {
    params.set("product_ids", env.whopResourceId);
  }

  if (env.whopPlanId) {
    params.set("plan_ids", env.whopPlanId);
  }

  async function requestMemberships(authToken: string) {
    const response = await fetch(`${WHOP_API_BASE}/api/v1/memberships?${params}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });

    return parseWhopResponse<{ data?: WhopMembership[] }>(response);
  }

  let memberships: { data?: WhopMembership[] };

  if (env.whopApiKey) {
    try {
      memberships = await requestMemberships(env.whopApiKey);
    } catch (error) {
      if (!(error instanceof WhopApiError) || ![401, 403].includes(error.status)) {
        throw error;
      }
      console.error(
        `Whop API key rejected on membership lookup (${error.status}). Falling back to the user token; check WHOP_API_KEY.`
      );
      memberships = await requestMemberships(userAccessToken);
    }
  } else {
    memberships = await requestMemberships(userAccessToken);
  }

  const activeMembership =
    memberships.data?.find(
      (membership) =>
        membership.manage_url &&
        ["active", "trialing", "past_due", "completed"].includes(membership.status || "")
    ) || memberships.data?.find((membership) => membership.manage_url);

  return activeMembership?.manage_url || env.billingPortalFallbackUrl;
}
```

---

## 7. Entitlements, CORS, and the API routes

### `apps/web/lib/entitlements.ts`

Turns a request's bearer token into an `EntitlementSnapshot`. Mock mode short-circuits for local dev (and is impossible in production because `getServerEnv` throws first). Otherwise it reads the user, checks access, and derives the tier. The `features` line is the gate: paying users get `PREMIUM_FEATURES`, others get `FREE_FEATURES` only when `WHOP_ALLOW_FREE_ACCESS` is on, else nothing.

```ts
import type { NextRequest } from "next/server";
import { getCheckoutUrl, getServerEnv } from "./env";
import { FREE_FEATURES, PREMIUM_FEATURES } from "./plans";
import type { EntitlementSnapshot } from "./types";
import { checkWhopAccess, fetchWhopUserInfo } from "./whop";

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return header.slice("bearer ".length).trim();
}

export function publicEntitlementError(error: unknown) {
  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    return error.message;
  }

  return "Unable to verify Whop access. Please sign in again or refresh access.";
}

function mockEntitlement(token: string): EntitlementSnapshot {
  const tier = token.includes("admin")
    ? "admin"
    : token.includes("premium")
      ? "premium"
      : "free";
  const hasAccess = tier === "premium" || tier === "admin";

  return {
    hasAccess,
    accessLevel: tier === "admin" ? "admin" : hasAccess ? "customer" : "no_access",
    tier,
    source: "mock",
    checkedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    checkoutUrl: getCheckoutUrl(),
    billingPortalUrl: getServerEnv().billingPortalFallbackUrl,
    features: hasAccess
      ? PREMIUM_FEATURES
      : getServerEnv().allowFreeAccess
        ? FREE_FEATURES
        : [],
    user: {
      id: `user_mock_${tier}`,
      name: tier === "free" ? "Mock Free User" : "Mock Premium User",
      username: tier,
      email: `${tier}@example.test`
    }
  };
}

export async function resolveEntitlementFromRequest(request: NextRequest) {
  const token = getBearerToken(request);
  const env = getServerEnv();

  if (env.mockMode && (!token || token.startsWith("mock-"))) {
    return mockEntitlement(token || "mock-free");
  }

  if (!token) {
    throw new Error("Missing Whop OAuth access token");
  }

  if (!env.whopResourceId) {
    throw new Error("WHOP_ACCESS_RESOURCE_ID is not configured");
  }

  const user = await fetchWhopUserInfo(token);
  const access = await checkWhopAccess({
    userId: user.sub,
    userAccessToken: token
  });

  const hasAccess =
    access.has_access ||
    access.access_level === "customer" ||
    access.access_level === "admin";
  const accessLevel = access.access_level || (hasAccess ? "customer" : "no_access");

  return {
    hasAccess,
    accessLevel,
    tier: accessLevel === "admin" ? "admin" : hasAccess ? "premium" : "free",
    source: access.source || "whop-user-token",
    checkedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    checkoutUrl: getCheckoutUrl(),
    billingPortalUrl: env.billingPortalFallbackUrl,
    features: hasAccess ? PREMIUM_FEATURES : env.allowFreeAccess ? FREE_FEATURES : [],
    user: {
      id: user.sub,
      name: user.name,
      username: user.preferred_username,
      email: user.email,
      picture: user.picture
    }
  } satisfies EntitlementSnapshot;
}
```

### `apps/web/lib/cors.ts`

The extension's origin calls these routes cross-origin, so every route shares this helper. Auth is a bearer token in a header (not a cookie), so a permissive origin is not a credential-theft vector, but the wildcard is dev-only: it is ignored when `NODE_ENV=production`.

```ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getAllowedOrigins() {
  return (process.env.EXTENSION_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function buildCorsHeaders(request: NextRequest) {
  const requestOrigin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();
  const wildcard = allowedOrigins.includes("*");
  if (wildcard && process.env.NODE_ENV === "production") {
    console.error(
      "EXTENSION_ALLOWED_ORIGINS=* is ignored in production. Set explicit chrome-extension:// origins."
    );
  }
  const allowAny = wildcard && process.env.NODE_ENV !== "production";
  const isAllowed = requestOrigin && allowedOrigins.includes(requestOrigin);
  const headers = new Headers();

  if (allowAny) {
    headers.set("Access-Control-Allow-Origin", requestOrigin || "*");
  } else if (isAllowed && requestOrigin) {
    headers.set("Access-Control-Allow-Origin", requestOrigin);
  }

  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization,Content-Type,X-Extension-Version"
  );
  headers.set("Access-Control-Max-Age", "600");

  return headers;
}

export function optionsWithCors(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request)
  });
}

export function jsonWithCors<T>(
  request: NextRequest,
  body: T,
  init: ResponseInit = {}
) {
  const headers = new Headers(init.headers);
  buildCorsHeaders(request).forEach((value, key) => headers.set(key, value));

  return NextResponse.json(body, { ...init, headers });
}
```

### `apps/web/app/api/extension/entitlements/route.ts`

The main access endpoint the popup hits on open and refresh. Returns the snapshot, or `401` with a safe error.

```ts
import type { NextRequest } from "next/server";
import { jsonWithCors, optionsWithCors } from "@/lib/cors";
import { publicEntitlementError, resolveEntitlementFromRequest } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export function OPTIONS(request: NextRequest) {
  return optionsWithCors(request);
}

export async function POST(request: NextRequest) {
  try {
    const entitlement = await resolveEntitlementFromRequest(request);
    return jsonWithCors(request, entitlement, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return jsonWithCors(
      request,
      {
        hasAccess: false,
        accessLevel: "no_access",
        tier: "free",
        error: publicEntitlementError(error)
      },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
}
```

### `apps/web/app/api/extension/gated-resource/route.ts`

The premium feature. It re-resolves access on the server and returns `402` (with the entitlement) when the user has not paid. This `402` is the real gate; the popup's cached snapshot is only UI.

```ts
import type { NextRequest } from "next/server";
import { jsonWithCors, optionsWithCors } from "@/lib/cors";
import { publicEntitlementError, resolveEntitlementFromRequest } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export function OPTIONS(request: NextRequest) {
  return optionsWithCors(request);
}

export async function POST(request: NextRequest) {
  let entitlement: Awaited<ReturnType<typeof resolveEntitlementFromRequest>>;

  try {
    entitlement = await resolveEntitlementFromRequest(request);
  } catch (error) {
    return jsonWithCors(
      request,
      {
        ok: false,
        code: "auth_failed",
        message: publicEntitlementError(error)
      },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!entitlement.hasAccess) {
    return jsonWithCors(
      request,
      {
        ok: false,
        code: "premium_required",
        message: "Whop access is required before this extension feature unlocks.",
        entitlement
      },
      { status: 402, headers: { "Cache-Control": "no-store" } }
    );
  }

  return jsonWithCors(
    request,
    {
      ok: true,
      entitlement,
      resource: {
        title: "Whop verified premium feature",
        items: [
          "The user is signed in with Whop.",
          "The API rechecked the configured resource ID.",
          "Replace this payload with your extension's paid feature."
        ]
      }
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
```

### `apps/web/app/api/extension/billing-portal/route.ts`

Returns the user's Whop billing-management URL (or the fallback). Mock/unauthenticated callers get the fallback.

```ts
import type { NextRequest } from "next/server";
import { jsonWithCors, optionsWithCors } from "@/lib/cors";
import { getServerEnv } from "@/lib/env";
import { fetchWhopUserInfo, findBillingPortalUrl } from "@/lib/whop";

export const dynamic = "force-dynamic";

export function OPTIONS(request: NextRequest) {
  return optionsWithCors(request);
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const header = request.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice("bearer ".length).trim()
    : "";

  if (!token || token.startsWith("mock-")) {
    return jsonWithCors(
      request,
      { url: env.billingPortalFallbackUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const user = await fetchWhopUserInfo(token);
    const url = await findBillingPortalUrl({
      userId: user.sub,
      userAccessToken: token
    });
    return jsonWithCors(request, { url }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonWithCors(
      request,
      { url: env.billingPortalFallbackUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
```

### `apps/web/app/api/extension/config/route.ts`

Public, non-secret config the options page and a quick smoke test read.

```ts
import type { NextRequest } from "next/server";
import { jsonWithCors, optionsWithCors } from "@/lib/cors";
import { getCheckoutUrl, getServerEnv } from "@/lib/env";

export function OPTIONS(request: NextRequest) {
  return optionsWithCors(request);
}

export function GET(request: NextRequest) {
  const env = getServerEnv();

  return jsonWithCors(request, {
    appName: "Whop Chrome Extension Starter",
    appUrl: env.publicAppUrl,
    checkoutUrl: getCheckoutUrl(),
    mockMode: env.mockMode,
    oauth: {
      clientId: env.whopAppId,
      scope: "openid profile email",
      resourceId: env.whopResourceId
    }
  });
}
```

`GET /api/health` is a trivial `{ ok: true }` liveness route (described).

---

## 8. Checkout

### `apps/web/components/CheckoutEmbed.tsx`

The Whop embedded checkout. `skipRedirect` keeps the user on the page; `onComplete` routes to a confirmation page with the receipt id.

```tsx
"use client";

import {
  WhopCheckoutEmbed,
  useCheckoutEmbedControls
} from "@whop/checkout/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CheckoutEmbed({ planId }: { planId: string }) {
  const router = useRouter();
  const checkoutControlsRef = useCheckoutEmbedControls();
  const [checkoutReady, setCheckoutReady] = useState(false);

  function handleComplete(_planId: string, receiptId?: string) {
    const params = new URLSearchParams({ source: "checkout" });
    if (receiptId) params.set("receipt", receiptId);
    router.push("/checkout/complete?" + params.toString());
  }

  return (
    <div className="checkout-embed">
      <WhopCheckoutEmbed
        ref={checkoutControlsRef}
        planId={planId}
        skipRedirect
        onStateChange={(state) => setCheckoutReady(state === "ready")}
        onComplete={handleComplete}
        theme="light"
        fallback={<div className="embed-loading">Loading secure checkout...</div>}
      />
      {!checkoutReady && (
        <p className="checkout-status">Preparing secure Whop checkout...</p>
      )}
    </div>
  );
}
```

CSP for the embed: allow `frame-src https://*.whop.com` and `script-src https://js.whop.com` (add the `sandbox-*` hosts in sandbox).

### `apps/web/app/checkout/page.tsx`

Renders the embed when `WHOP_PLAN_ID` is set, with a hosted-checkout fallback link; otherwise shows a setup callout.

```tsx
import Link from "next/link";
import { CheckoutEmbed } from "@/components/CheckoutEmbed";
import { getCheckoutUrl, getServerEnv } from "@/lib/env";

export default function CheckoutPage() {
  const env = getServerEnv();

  return (
    <main className="checkout-page">
      <section className="checkout-copy">
        <p className="eyebrow">Whop checkout</p>
        <h1>Unlock extension access</h1>
        <p className="lead">
          After purchase, users sign in with Whop inside the extension.
          Webhooks can update your own database if you add persistent accounts.
        </p>
        <ul className="clean-list">
          <li>Customer login through Whop OAuth</li>
          <li>Server-side gating through Whop check-access</li>
          <li>Billing management through Whop memberships</li>
        </ul>
      </section>

      <section className="checkout-box">
        {env.whopPlanId ? (
          <>
            <CheckoutEmbed planId={env.whopPlanId} />
            <a className="fallback-link" href={getCheckoutUrl()}>
              Open hosted checkout instead
            </a>
          </>
        ) : (
          <div className="setup-callout">
            <h2>Plan id not configured</h2>
            <p>
              Set <code>WHOP_PLAN_ID</code> in <code>apps/web/.env.local</code>
              to render the Whop checkout embed.
            </p>
            <Link className="button secondary" href="/docs">
              Read setup docs
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
```

`app/checkout/complete/page.tsx` is a thank-you page that reads the `receipt`/`source` query params. The landing (`app/page.tsx`), layout, and `/demo` and `/docs` pages are standard marketing/server components — describe the gate states and link to setup. All web UI is styled with a single stylesheet; no component library.

---

## 9. Popup and options UI (described)

The popup (`extension/src/popup.ts` + `popup.html` + `styles.css`) is a vanilla-DOM UI built from small element helpers; no framework. On open it sends `{ type: "GET_STATE" }` to the background worker and renders three panels:

- **Account panel:** the signed-in Whop user (name/username) and an "Access active / No access" pill. When mock mode is on it also shows "Mock free" / "Mock premium" buttons that call `SIGN_IN` with a `mockTier`.
- **Access/gate panel:** signed-out, it shows **Login** (calls `SIGN_IN`, which runs the OAuth flow in the worker) and **Sign up** (opens the checkout URL in a new tab via `chrome.tabs.create`). Signed-in with access, it renders the "premium gate is open" state with a **Load gated server data** button that calls `GET_GATED_RESOURCE` and shows the `402` message if access was lost.
- **Header icons:** Refresh (`REFRESH_ENTITLEMENT`), Manage billing (`GET_BILLING_PORTAL`, then opens the returned URL), Logout (`LOG_OUT`), and a gear that opens the options page.

The popup talks to the worker exclusively through `chrome.runtime.sendMessage`, typed by `RuntimeMessage`, and unwraps `{ ok, payload }` / `{ ok: false, error }`. It opens external URLs only after validating they are `http(s)`.

The options page (`extension/src/options.ts` + `options.html`) is a small form bound to `RuntimeConfig`: API base URL, OAuth client id, resource id, scope, and a mock-mode checkbox. It loads current values with `getRuntimeConfig`, persists edits with `saveRuntimeConfig` (into `chrome.storage.local`), can reset to defaults, and runs a "Test API" button against `GET /api/extension/config`.

---

## 10. Manifest (Manifest V3) — `extension/public/manifest.json`

Minimal permissions (`identity` for the OAuth flow, `storage` for tokens), host access scoped to Whop and the local API only, and a CSP `connect-src` that lists exactly the origins the extension calls. Replace `your-app.vercel.app` with your deployed web app origin; do not widen `host_permissions` to all sites.

```json
{
  "manifest_version": 3,
  "name": "Whop Extension Starter",
  "version": "0.1.0",
  "description": "A Chrome extension starter for Whop login, billing, and gated access.",
  "minimum_chrome_version": "113",
  "permissions": ["identity", "storage"],
  "host_permissions": ["https://api.whop.com/*", "http://localhost:3001/*"],
  "action": {
    "default_title": "Whop Starter",
    "default_popup": "popup.html"
  },
  "options_page": "options.html",
  "background": {
    "service_worker": "assets/background.js",
    "type": "module"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://api.whop.com http://localhost:3001 https://your-app.vercel.app;"
  }
}
```

---

## 11. Webhooks — `apps/web/app/api/webhooks/whop/route.ts`

Verifies the Whop signature with the SDK over the raw body. The `webhookKey` must be the base64 of the signing secret. The template only logs; in a real app, dedupe by the webhook id and update your own store. Returns `200` immediately after validation so Whop does not retry.

```ts
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
  const apiKey = process.env.WHOP_API_KEY;

  if (!webhookSecret || !apiKey) {
    return new Response("Webhook verification is not configured", { status: 501 });
  }

  try {
    const { Whop } = await import("@whop/sdk");
    const whop = new Whop({
      apiKey,
      webhookKey: Buffer.from(webhookSecret).toString("base64")
    });

    const requestBodyText = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const webhookData = whop.webhooks.unwrap(requestBodyText, { headers });

    // In a database-backed app, enqueue this event and dedupe by the webhook id.
    const webhookId =
      request.headers.get("webhook-id") ||
      request.headers.get("svix-id") ||
      request.headers.get("x-webhook-id") ||
      "unknown";
    console.info("[WHOP WEBHOOK]", {
      id: webhookId,
      type: webhookData.type
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error(
      "[WHOP WEBHOOK ERROR]",
      error instanceof Error ? error.message : "Invalid webhook"
    );
    return new Response("Invalid webhook", { status: 400 });
  }
}
```

---

## 12. Local testing and production

**Run locally:** `pnpm dev:web` (web app on `http://localhost:3001`) and `pnpm build:extension` (or `pnpm dev:extension` to rebuild on change). In `chrome://extensions`, enable Developer Mode, **Load unpacked**, and select `extension/dist`. Copy the unpacked extension id and add `https://<that-id>.chromiumapp.org/whop` to your Whop OAuth app's redirect URIs. With mock mode off, sign in with a Whop sandbox account that has access; the popup should unlock and Manage billing should open Whop's memberships page.

**Going to production:**

1. Set the web app's production env in Vercel: real `NEXT_PUBLIC_APP_URL`, `EXTENSION_ALLOWED_ORIGINS=chrome-extension://<published-id>`, `WHOP_MOCK_MODE=false`, `WHOP_ALLOW_FREE_ACCESS=false`, and the real Whop ids/keys.
2. Build the extension with production `VITE_*` values (`VITE_API_BASE_URL` = your domain, `VITE_MOCK_MODE=false`), and replace `your-app.vercel.app` in the manifest CSP with your domain.
3. Publish to the Chrome Web Store to get the permanent extension id, then add `https://<published-id>.chromiumapp.org/whop` to the Whop OAuth app.
4. Point the Whop webhook at `https://<your-domain>/api/webhooks/whop`.

---

## 13. Whop SDK + integration gotchas

- **App API key, not Company key.** The server uses an App API key (`apik_…`) for the access check and webhook verification. OAuth token exchange needs the `oauth:token_exchange` permission enabled on the app.
- **The extension is a public OAuth client.** It sends PKCE and no client secret. (Server-side Whop apps need a client secret in the token exchange; a Chrome extension must not embed one.)
- **`nonce` is required for the `openid` scope.** Whop's `/oauth/authorize` rejects `openid` requests without a `nonce`. Generate one per login. The returned `id_token` is not validated client-side because the server re-fetches `/oauth/userinfo`.
- **Token exchange is `application/json`.** A form-encoded body is rejected. Use `Content-Type: application/json` and `JSON.stringify`.
- **Check access with `GET /api/v1/users/{userId}/access/{resourceId}`** and a bearer token; the response is `{ has_access, access_level }`. The answer is computed from the user's real memberships, so it is honest regardless of which valid token asks.
- **Webhook key is base64.** `webhookKey: Buffer.from(secret).toString("base64")`, and `webhooks.unwrap` takes the **raw** request text plus headers, never parsed JSON. The verifier checks the timestamp; add your own idempotency by webhook id before acting on events.
- **Redirect URI is `https://<extension-id>.chromiumapp.org/whop`.** It changes between the unpacked dev id and the published Web Store id; register both.
- **`frame-ancestors 'none'` is fine.** It does not block the checkout embed because the app is the parent frame.
- **Security defaults are load-bearing.** Mock mode is dev-only and the server throws if it is on in production; free access defaults off; the CORS wildcard is ignored in production; `host_permissions` is scoped to Whop + your API, not all sites. The popup's cached entitlement is UI only; the server's live re-check on `gated-resource` is the actual gate.
