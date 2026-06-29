import "./styles.css";
import {
  DEFAULT_CONFIG,
  getRuntimeConfig,
  resetRuntimeConfig,
  saveRuntimeConfig
} from "./shared/config";
import type { RuntimeConfig } from "./shared/types";

const form = getElement("options-form") as HTMLFormElement;
const statusLine = getElement("options-status");
const redirectUri = getElement("redirect-uri");
const copyRedirect = getElement("copy-redirect");
const resetButton = getElement("reset-options");
const testApiButton = getElement("test-api");

void boot();

async function boot() {
  redirectUri.textContent = chrome.identity.getRedirectURL("whop");
  fillForm(await getRuntimeConfig());
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void save();
});

resetButton.addEventListener("click", () => {
  void (async () => {
    await resetRuntimeConfig();
    fillForm(DEFAULT_CONFIG);
    setStatus("Options reset to compiled defaults.");
  })();
});

copyRedirect.addEventListener("click", () => {
  void navigator.clipboard.writeText(redirectUri.textContent || "").then(() => {
    setStatus("Redirect URI copied.");
  });
});

testApiButton.addEventListener("click", () => {
  void testApi();
});

async function save() {
  try {
    const config = readForm();
    await saveRuntimeConfig(config);
    setStatus("Options saved.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to save options.");
  }
}

async function testApi() {
  setStatus("Testing API...");

  try {
    const config = readForm();
    const response = await fetch(`${config.apiBaseUrl}/api/extension/config`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const payload = await response.json();
    setStatus(`API ok. Server mode: ${payload.mockMode ? "mock" : "whop"}.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "API test failed.");
  }
}

function fillForm(config: RuntimeConfig) {
  setInput("api-base-url", config.apiBaseUrl);
  setInput("checkout-url", config.checkoutUrl);
  setInput("whop-client-id", config.whopClientId);
  setInput("whop-resource-id", config.whopResourceId);
  setInput("oauth-scope", config.oauthScope);
  (getElement("mock-mode") as HTMLInputElement).checked = config.mockMode;
}

function readForm(): RuntimeConfig {
  return {
    apiBaseUrl: readWebUrlInput("api-base-url", { trimTrailingSlash: true }),
    checkoutUrl: readWebUrlInput("checkout-url"),
    whopClientId: readInput("whop-client-id"),
    whopResourceId: readInput("whop-resource-id"),
    oauthScope: readInput("oauth-scope"),
    mockMode: (getElement("mock-mode") as HTMLInputElement).checked
  };
}

function setInput(id: string, value: string) {
  (getElement(id) as HTMLInputElement).value = value;
}

function readInput(id: string) {
  return (getElement(id) as HTMLInputElement).value.trim();
}

function readWebUrlInput(
  id: string,
  options: { trimTrailingSlash?: boolean } = {}
) {
  const value = readInput(id);
  const url = new URL(value);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("URLs must start with http:// or https://.");
  }

  if (options.trimTrailingSlash && (url.search || url.hash)) {
    throw new Error("API base URL cannot include a query string or hash.");
  }

  const normalized = url.toString();
  return options.trimTrailingSlash ? normalized.replace(/\/+$/, "") : normalized;
}

function setStatus(message: string) {
  statusLine.textContent = message;
}

function getElement(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element;
}
