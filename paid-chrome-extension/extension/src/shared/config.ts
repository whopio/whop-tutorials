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
  return {
    ...DEFAULT_CONFIG,
    ...(stored[CONFIG_KEY] || {})
  };
}

export async function saveRuntimeConfig(config: RuntimeConfig) {
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
}

export async function resetRuntimeConfig() {
  await chrome.storage.local.remove(CONFIG_KEY);
}
