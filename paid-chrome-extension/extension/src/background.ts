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
