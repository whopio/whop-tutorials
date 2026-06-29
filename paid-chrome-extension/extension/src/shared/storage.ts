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
