import "./styles.css";
import type { EntitlementSnapshot, ExtensionState, RuntimeMessage } from "./shared/types";

const accountPanel = getElement("account-panel");
const accessPanel = getElement("access-panel");
const resultPanel = getElement("result-panel");
const headerActions = getElement("header-actions");

let state: ExtensionState | undefined;

void boot();

async function boot() {
  state = await sendMessage<ExtensionState>({ type: "GET_STATE" });
  render();
}

function render() {
  if (!state) return;

  renderHeaderActions(state);
  renderAccount(state);
  renderAccess(state.entitlement);
}

function renderHeaderActions(current: ExtensionState) {
  headerActions.replaceChildren(
    iconButton(
      "Open options",
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2.05 2.05 0 0 1-2.9 2.9l-.06-.06A1.7 1.7 0 0 0 15 19.43a1.7 1.7 0 0 0-1 .57 1.7 1.7 0 0 0-.4 1.1V21a2.1 2.1 0 0 1-4.2 0v-.09a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.57 1.7 1.7 0 0 0-1.87.34l-.06.06a2.05 2.05 0 0 1-2.9-2.9l.06-.06A1.7 1.7 0 0 0 4.57 15a1.7 1.7 0 0 0-.57-1 1.7 1.7 0 0 0-1.1-.4H2.8a2.1 2.1 0 0 1 0-4.2h.09A1.7 1.7 0 0 0 4 9a1.7 1.7 0 0 0 .57-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2.05 2.05 0 0 1 2.9-2.9l.06.06A1.7 1.7 0 0 0 9 4.57a1.7 1.7 0 0 0 1-.57 1.7 1.7 0 0 0 .4-1.1V2.8a2.1 2.1 0 0 1 4.2 0v.09A1.7 1.7 0 0 0 15 4a1.7 1.7 0 0 0 1 .57 1.7 1.7 0 0 0 1.87-.34l.06-.06a2.05 2.05 0 0 1 2.9 2.9l-.06.06A1.7 1.7 0 0 0 19.43 9a1.7 1.7 0 0 0 .57 1 1.7 1.7 0 0 0 1.1.4h.1a2.1 2.1 0 0 1 0 4.2h-.1A1.7 1.7 0 0 0 20 14a1.7 1.7 0 0 0-.6 1Z"/></svg>`,
      () => chrome.runtime.openOptionsPage()
    )
  );

  if (!current.signedIn) return;

  headerActions.prepend(
    iconButton(
      "Refresh access",
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.3 6.36"/><path d="M3 12A9 9 0 0 1 18.3 5.64"/><path d="M18 2v4h-4"/><path d="M6 22v-4h4"/></svg>`,
      async () => {
        state = {
          ...current,
          entitlement: await sendMessage<EntitlementSnapshot>({
            type: "REFRESH_ENTITLEMENT"
          })
        };
        render();
      }
    ),
    iconButton(
      "Manage billing",
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 10h18"/><path d="M7 15h4"/></svg>`,
      openBillingPortal
    ),
    iconButton(
      "Logout",
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17 15 12l-5-5"/><path d="M15 12H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></svg>`,
      async () => {
        state = await sendMessage<ExtensionState>({ type: "LOG_OUT" });
        render();
        setResult("Signed out. Your extension can keep free actions available here.");
      }
    )
  );
}

function renderAccount(current: ExtensionState) {
  const entitlement = current.entitlement;
  const hasAccess = Boolean(entitlement?.hasAccess);
  const signedInLabel = current.signedIn
    ? current.user?.name || current.user?.username || "Whop user"
    : "Not signed in";

  const badge = document.createElement("span");
  badge.className = `tier-pill ${hasAccess ? "premium" : "free"}`;
  badge.textContent = hasAccess ? "Access active" : "No access";

  const accountCopy = div("stack");
  accountCopy.append(paragraph("eyebrow", "Whop account"), heading("h2", signedInLabel));

  const accountRow = div("account-row");
  accountRow.append(accountCopy, badge);

  const actions = div("button-grid");
  actions.id = "account-actions";

  accountPanel.replaceChildren(accountRow, paragraph("muted", statusLine(entitlement)));

  if (current.signedIn && !hasAccess) {
    accountPanel.append(actions);
    actions.append(
      button("Refresh access", "secondary", async () => {
        state = {
          ...current,
          entitlement: await sendMessage<EntitlementSnapshot>({
            type: "REFRESH_ENTITLEMENT"
          })
        };
        render();
      })
    );
  }

  if (current.config.mockMode) {
    actions.append(
      button("Mock free", "secondary", async () => {
        state = await signIn("free");
        render();
      }),
      button("Mock premium", "secondary", async () => {
        state = await signIn("premium");
        render();
      })
    );
  }
}

function renderAccess(entitlement?: EntitlementSnapshot) {
  const hasAccess = Boolean(entitlement?.hasAccess);
  const actions = div("button-grid");
  actions.id = "access-actions";

  if (!hasAccess) {
    actions.append(
      button("Login", "primary", async () => {
        state = await signIn();
        render();
      }),
      button("Sign up", "secondary", openCheckout)
    );
  }

  const benefits = document.createElement("ul");
  benefits.className = "steps-list";
  const benefitCopy = hasAccess
    ? [
        "Whop verified this user has access.",
        "Your paid feature can render in this section.",
        "Billing and logout are available from the top-right icons."
      ]
    : [
        "Sell access to your extension with Whop checkout.",
        "Let customers log in with Whop OAuth.",
        "Unlock this section only after Whop confirms access."
      ];

  for (const step of benefitCopy) {
    const item = document.createElement("li");
    item.textContent = step;
    benefits.append(item);
  }

  const status = div(`access-status ${hasAccess ? "on" : "off"}`);
  status.append(
    paragraph("eyebrow", "Gate status"),
    heading("h3", hasAccess ? "Access granted" : "Access locked"),
    paragraph(
      "muted",
      hasAccess
        ? "This is the state paying customers should see after Whop confirms their membership."
        : "This is the state non-customers see before they log in or purchase access."
    )
  );

  const children: Node[] = [
    paragraph("eyebrow", "Template access flow"),
    heading("h2", hasAccess ? "Premium gate is open" : "Unlock this extension"),
    paragraph(
      "muted",
      hasAccess
        ? "Replace this section with your extension feature. The starter has already handled Whop login, billing, and access checks."
        : "Use this area to explain the benefits of your paid extension before sending users to Whop checkout."
    ),
    status,
    benefits
  ];

  if (hasAccess) {
    children.push(renderGatedContent());
  } else {
    children.splice(4, 0, actions);
  }

  accessPanel.replaceChildren(...children);

  if (entitlement?.features?.length) {
    const featureList = document.createElement("ul");
    featureList.className = "feature-list";
    for (const feature of entitlement.features) {
      const item = document.createElement("li");
      item.textContent = feature.replaceAll("_", " ");
      featureList.append(item);
    }
    accessPanel.append(featureList);
  }
}

function renderGatedContent() {
  const content = div("gated-content");
  content.append(
    paragraph("eyebrow", "Unlocked content"),
    heading("h3", "Your paid extension feature goes here"),
    paragraph(
      "muted",
      "This section is visible because Whop confirmed access. Replace it with the real tool, data, workflow, or premium UI your extension sells."
    ),
    button("Load gated server data", "primary", checkGatedAccess)
  );

  return content;
}

async function signIn(mockTier?: "free" | "premium" | "admin") {
  await sendMessage<EntitlementSnapshot>({ type: "SIGN_IN", mockTier });
  return sendMessage<ExtensionState>({ type: "GET_STATE" });
}

async function checkGatedAccess() {
  if (!state?.signedIn) {
    setResult("Sign in with Whop before checking the gated feature.");
    return;
  }

  const payload = await sendMessage<{
    ok: boolean;
    message?: string;
    resource?: { title: string; items: string[] };
    entitlement?: EntitlementSnapshot;
  }>({ type: "GET_GATED_RESOURCE" });

  if (payload.entitlement) {
    state = { ...(state as ExtensionState), entitlement: payload.entitlement };
    render();
  }

  if (!payload.ok || !payload.resource) {
    setResult(payload.message || "Whop access is required before this feature unlocks.");
    return;
  }

  const fragment = document.createDocumentFragment();
  fragment.append(paragraph("eyebrow", "Gated result"), heading("h3", payload.resource.title));
  fragment.append(list(payload.resource.items));
  setResult(fragment);
}

async function openBillingPortal() {
  setResult("Opening Whop billing...");

  try {
    const payload = await sendMessage<{ url: string; message?: string }>({
      type: "GET_BILLING_PORTAL"
    });
    openUrl(payload.url);
    setResult(payload.message || "Opened Whop memberships in a new tab.");
  } catch (error) {
    const fallbackUrl =
      state?.entitlement?.billingPortalUrl || "https://whop.com/@me/settings/memberships/";
    openUrl(fallbackUrl);
    setResult(
      error instanceof Error
        ? `${error.message} Opened Whop memberships instead.`
        : "Opened Whop memberships instead."
    );
  }
}

function openCheckout() {
  const url = state?.entitlement?.checkoutUrl || state?.config.checkoutUrl;
  if (!url) return;
  openUrl(url);
}

function openUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    if (!["https:", "http:"].includes(parsedUrl.protocol)) {
      throw new Error("URL must be an http(s) URL.");
    }
    chrome.tabs.create({ url: parsedUrl.toString() });
  } catch (error) {
    setResult(error instanceof Error ? error.message : "Invalid URL.");
  }
}

function setResult(content: string | Node) {
  resultPanel.hidden = false;
  if (typeof content === "string") {
    resultPanel.textContent = content;
    return;
  }

  resultPanel.replaceChildren(content);
}

function statusLine(entitlement?: EntitlementSnapshot) {
  if (!entitlement) return "Sign in to check Whop access.";
  if (entitlement.error) return entitlement.error;
  if (entitlement.hasAccess) {
    return `Access confirmed at ${new Date(entitlement.checkedAt).toLocaleTimeString()}.`;
  }
  return "No paid access yet. Send the user to Whop checkout from here.";
}

function button(
  label: string,
  variant: "primary" | "secondary" | "ghost",
  onClick: () => void | Promise<void>
) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `button ${variant}`;
  element.textContent = label;
  element.addEventListener("click", () => {
    void (async () => {
      element.disabled = true;
      try {
        await onClick();
      } catch (error) {
        setResult(error instanceof Error ? error.message : "Action failed.");
      } finally {
        element.disabled = false;
      }
    })();
  });
  return element;
}

function iconButton(label: string, icon: string, onClick: () => void | Promise<void>) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "icon-button";
  element.title = label;
  element.setAttribute("aria-label", label);
  element.innerHTML = icon;
  element.addEventListener("click", () => {
    void (async () => {
      element.disabled = true;
      try {
        await onClick();
      } catch (error) {
        setResult(error instanceof Error ? error.message : "Action failed.");
      } finally {
        element.disabled = false;
      }
    })();
  });
  return element;
}

function div(className: string) {
  const element = document.createElement("div");
  element.className = className;
  return element;
}

function paragraph(className: string, text: string) {
  const element = document.createElement("p");
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function heading(level: "h2" | "h3", text: string) {
  const element = document.createElement(level);
  element.textContent = text;
  return element;
}

function list(items: string[]) {
  const element = document.createElement("ul");
  for (const itemText of items) {
    const item = document.createElement("li");
    item.textContent = itemText;
    element.append(item);
  }
  return element;
}

async function sendMessage<T>(message: RuntimeMessage): Promise<T> {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(response?.error || "Extension background request failed.");
  }
  return response.payload as T;
}

function getElement(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element;
}
