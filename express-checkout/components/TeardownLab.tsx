"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadWhop } from "@whop/elements";
import {
  Checkout,
  CheckoutElement,
  ExpressCheckoutElement,
  WhopElements,
  type CheckoutPaymentCompletion,
  type CheckoutSetupCompletion,
  type CheckoutWaitlistCompletion,
} from "@whop/elements-react";
import { Badge, Button, Code, Heading, Text } from "@whop/react/components";
import {
  ActivityLog,
  logEntry,
  type ActivityEntry,
} from "@/components/ActivityLog";
import { CopyValue } from "@/components/CopyValue";

export interface ReceiptSummary {
  id: string;
  status: string;
  substatus: string | null;
  // A money object since SDK 1.1.0: amount is a decimal string ("5.00").
  total: { amount: string; currency: string } | null;
  currency: string;
  paidAt: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
}

// What Whop appends to returnUrl: `payment` (the pay_ id) and `status`
// (succeeded, failed or canceled).
export interface ReturnParams {
  status: string | null;
  paymentId: string | null;
  raw: string;
}

type Completion =
  | CheckoutPaymentCompletion
  | CheckoutWaitlistCompletion
  | CheckoutSetupCompletion;

const SUCCESS_CARD = "4242 4242 4242 4242";
const DECLINE_CARD = "4000 0000 0000 0002";
const MISSING_PLAN = "plan_DOESNOTEXIST";
const APPEARANCE = { theme: { appearance: "light", accentColor: "orange" } } as const;

// onComplete runs right before Whop may move the tab to its own page, so the
// receipt id waits in this tab's storage until the visitor comes back.
const PENDING_KEY = "express-demo:pending-receipt";

function readPending(): string | null {
  try {
    return sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

function writePending(value: string | null) {
  try {
    if (value) sessionStorage.setItem(PENDING_KEY, value);
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {}
}

function Panel({
  step,
  id,
  title,
  children,
}: {
  step: number;
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      data-annotation-id={id}
      className="rounded-xl border border-[#E5E4E0] bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E5E4E0] text-[11px] font-semibold text-[#151515]/70">
          {step}
        </span>
        <Heading size="3" as="h2">
          {title}
        </Heading>
      </div>
      {children}
    </section>
  );
}

const RESOLUTION_ROWS = [
  { key: "apple-pay", browser: "Safari or iPhone with Apple Pay set up", renders: "Apple Pay button" },
  { key: "google-pay", browser: "Chrome or Android with Google Pay", renders: "Google Pay button" },
  { key: "paypal", browser: "Any browser, when the seller accepts PayPal", renders: "PayPal button" },
  { key: "none", browser: "Everything else, including this demo", renders: "Nothing, so the page offers Pay with card" },
] as const;

export function TeardownLab({
  planId,
  productTitle,
  price,
  initialCallback,
  initialRedirect,
  returnParams,
  environment,
  returnUrl,
}: {
  planId: string;
  productTitle: string;
  price: number;
  initialCallback: ReceiptSummary | null;
  initialRedirect: ReceiptSummary | null;
  returnParams: ReturnParams | null;
  environment: "production" | "sandbox";
  returnUrl: string;
}) {
  const [elements] = useState(() => loadWhop());
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const [wallet, setWallet] = useState<"pending" | "none" | "shown">("pending");
  const [cardOpen, setCardOpen] = useState(false);
  const [callbackReceipt, setCallbackReceipt] = useState<ReceiptSummary | null>(
    initialCallback,
  );
  const [redirectReceipt, setRedirectReceipt] = useState<ReceiptSummary | null>(
    initialRedirect,
  );
  const [verifying, setVerifying] = useState(false);
  const [inspect, setInspect] = useState<unknown>(null);
  const [inspectBusy, setInspectBusy] = useState(false);
  const [foilMounted, setFoilMounted] = useState(false);
  const [foilError, setFoilError] = useState<{ message: string; code?: string } | null>(null);
  const [foilQuiet, setFoilQuiet] = useState(false);
  const [shape, setShape] = useState<"express" | "form" | null>(null);
  const startedAt = useRef<number | null>(null);
  const walletBoxRef = useRef<HTMLDivElement | null>(null);

  const log = useCallback((kind: string, detail: string) => {
    setEntries((prev) => [...prev, logEntry(kind, detail)]);
  }, []);

  const offset = useCallback(() => {
    if (!startedAt.current) return "";
    return ` (+${Date.now() - startedAt.current}ms)`;
  }, []);

  const verifyReceipt = useCallback(
    async (
      receiptId: string,
      path: "callback" | "redirect",
    ): Promise<ReceiptSummary | null> => {
      setVerifying(true);
      try {
        for (let attempt = 0; attempt < 10; attempt++) {
          const res = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ receiptId, path }),
            keepalive: true,
          });
          // 202 is "not paid yet" and carries no receipt, so it has to be
          // checked before res.ok, which is true for the whole 2xx range.
          if (res.status === 202 || res.status === 404) {
            log("payments.retrieve", `${receiptId} -> still settling, retrying`);
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          if (res.ok) {
            const data = (await res.json()) as { receipt: ReceiptSummary };
            log(
              "payments.retrieve",
              `${data.receipt.id} -> ${data.receipt.status}/${data.receipt.substatus ?? ""} (server verified)`,
            );
            return data.receipt;
          }
          log("payments.retrieve", `${receiptId} -> rejected (${res.status})`);
          return null;
        }
        return null;
      } finally {
        setVerifying(false);
      }
    },
    [log],
  );

  // Back from Whop's own page: pick up the receipt onComplete parked before
  // the tab moved, unless the session already holds it.
  const pendingHandled = useRef(false);
  useEffect(() => {
    if (pendingHandled.current) return;
    pendingHandled.current = true;
    const pending = readPending();
    if (!pending) return;
    if (initialCallback?.id === pending) {
      writePending(null);
      return;
    }
    log("return", `found ${pending} from before the tab left this page`);
    void verifyReceipt(pending, "callback").then((r) => {
      if (r) setCallbackReceipt(r);
      writePending(null);
    });
  }, [initialCallback?.id, log, verifyReceipt]);

  // Step 4: the page just loaded with Whop's return params, so verify the
  // payment id from the address bar on the server.
  const redirectHandled = useRef(false);
  useEffect(() => {
    if (!returnParams || redirectHandled.current) return;
    redirectHandled.current = true;
    log("return-url", `landed with ${returnParams.raw || "(no query params)"}`);
    if (returnParams.status === "succeeded" && returnParams.paymentId) {
      void verifyReceipt(returnParams.paymentId, "redirect").then((r) => {
        if (r) setRedirectReceipt(r);
      });
    }
  }, [log, returnParams, verifyReceipt]);

  const handleComplete = useCallback(
    (completion: Completion) => {
      if (completion.result !== "payment") {
        log("onComplete", `result: "${completion.result}"${offset()}`);
        return;
      }
      log("onComplete", `paymentId: ${completion.paymentId}${offset()}`);
      writePending(completion.paymentId);
      void verifyReceipt(completion.paymentId, "callback").then((r) => {
        if (r) {
          setCallbackReceipt(r);
          writePending(null);
        }
      });
    },
    [log, offset, verifyReceipt],
  );

  // The wallet row has no "nothing to show" event. Its frame shows a loading
  // placeholder, then shrinks to 0px when no wallet can render, so the demo
  // watches it for up to 8 seconds after the element reports ready.
  const measureWalletRow = useCallback(() => {
    let checks = 0;
    const timer = window.setInterval(() => {
      const frame = walletBoxRef.current?.querySelector("iframe");
      const height = Math.round(frame?.getBoundingClientRect().height ?? 0);
      checks++;
      if (height > 0 && checks < 16) return;
      window.clearInterval(timer);
      log(
        "wallet row",
        height === 0
          ? "0px tall, no wallet for this browser on this domain"
          : `${height}px tall, wallet buttons showed up`,
      );
      setWallet(height === 0 ? "none" : "shown");
    }, 500);
  }, [log]);

  const runInspect = useCallback(async () => {
    setInspectBusy(true);
    log("payments.retrieve", `${callbackReceipt?.id ?? ""} (inspect)`);
    try {
      const res = await fetch("/api/inspect?which=callback");
      const data: unknown = await res.json();
      if (res.ok && data && typeof data === "object" && "payment" in data) {
        setInspect((data as { payment: unknown }).payment);
      }
    } finally {
      setInspectBusy(false);
    }
  }, [callbackReceipt?.id, log]);

  const jsxSnippet = `<WhopElements elements={loadWhop()} environment="${environment}">
  <Checkout plan="${planId}" returnUrl="${returnUrl}">
    <ExpressCheckoutElement />
  </Checkout>
</WhopElements>`;

  const loading = (text: string) => (
    <div className="flex h-11 w-full items-center justify-center rounded-lg bg-[#151515]/5">
      <Text size="1" color="gray">
        {text}
      </Text>
    </div>
  );

  return (
    <WhopElements elements={elements} environment={environment} appearance={APPEARANCE}>
      <div className="flex flex-col gap-4">
        <Panel step={1} id="mount" title="Add the button, watch it decide">
          <div className="flex flex-col gap-3">
            <Text size="2" color="gray" as="p">
              A few lines add the button. It checks which wallets this browser
              can pay with and shows only those.
            </Text>
            <pre className="overflow-x-auto rounded-lg bg-[#151515] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[#E5E4E0]">
              {jsxSnippet}
            </pre>

            <div className="flex flex-col gap-1">
              {RESOLUTION_ROWS.map((row) => {
                const active = wallet === "none" && row.key === "none";
                return (
                  <div
                    key={row.key}
                    className={[
                      "flex flex-wrap items-center gap-2 rounded-lg border px-3 py-1.5",
                      active
                        ? "border-[#FA4616]/50 bg-[#FA4616]/[0.06]"
                        : "border-[#E5E4E0]",
                    ].join(" ")}
                  >
                    <Text size="1" weight={active ? "bold" : "regular"}>
                      {row.browser}
                    </Text>
                    <Text size="1" color="gray">
                      → {row.renders}
                    </Text>
                    {active && (
                      <Badge color="orange" variant="solid" size="1" className="ml-auto">
                        THIS DEMO
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {!mounted ? (
              <Button
                type="button"
                size="3"
                onClick={() => {
                  startedAt.current = Date.now();
                  log("mount", `<ExpressCheckoutElement /> for ${planId}`);
                  setMounted(true);
                }}
              >
                Add the button
              </Button>
            ) : (
              <div className="flex flex-col gap-2" ref={walletBoxRef}>
                <Checkout
                  key="wallets"
                  plan={planId}
                  returnUrl={returnUrl}
                  onComplete={handleComplete}
                  fallback={loading("Checking which wallets this browser has...")}
                >
                  <ExpressCheckoutElement
                    onLoaderStart={() => log("ExpressCheckoutElement", `onLoaderStart${offset()}`)}
                    onReady={() => {
                      log("ExpressCheckoutElement", `onReady${offset()}`);
                      measureWalletRow();
                    }}
                    onError={(e) => log("onError", e.message)}
                  />
                </Checkout>
                <Text size="1" color="gray">
                  {wallet === "shown"
                    ? `Wallet buttons for ${productTitle} ($${price}) showed up in this browser.`
                    : `The real wallet row for ${productTitle} ($${price}). It stays empty on this demo, because wallets only show on a domain with Apple Pay set up in Whop.`}
                </Text>
              </div>
            )}
          </div>
        </Panel>

        <Panel step={2} id="dialog" title="Pay with card">
          <div className="flex flex-col gap-3">
            <Text size="2" color="gray" as="p">
              No wallet button shows on this demo, so every visitor pays
              through Whop&apos;s card form. Open it and pay with the test card
              below.
            </Text>
            <div className="flex flex-col gap-2.5 rounded-lg bg-[#FBFAF8] p-3">
              <CopyValue value={SUCCESS_CARD} label="Pays successfully" />
              <CopyValue value={DECLINE_CARD} label="Gets declined, for step 5" />
              <Text size="1" color="gray">
                Any future expiry date, any CVC, and any name and address.
              </Text>
            </div>
            {!cardOpen ? (
              <Button
                type="button"
                size="3"
                onClick={() => {
                  startedAt.current = Date.now();
                  log("mount", `<CheckoutElement /> for ${planId}`);
                  setCardOpen(true);
                }}
              >
                Pay with card
              </Button>
            ) : (
              <Checkout
                key="card"
                plan={planId}
                returnUrl={returnUrl}
                onComplete={handleComplete}
                fallback={loading("Loading the card form...")}
              >
                <CheckoutElement
                  onReady={() => log("CheckoutElement", `onReady${offset()}`)}
                  onError={(e) => log("onError", e.message)}
                />
              </Checkout>
            )}
            {verifying && (
              <Text size="1" color="gray">
                Double-checking the payment with Whop...
              </Text>
            )}
            {callbackReceipt && (
              <div className="flex flex-col gap-1.5 rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Text size="2" weight="bold">
                    Your receipt
                  </Text>
                  <Badge color="green" variant="soft" size="1">
                    {callbackReceipt.status}/{callbackReceipt.substatus ?? ""}
                  </Badge>
                </div>
                <Code size="1" variant="ghost" className="break-all">
                  {callbackReceipt.id}
                </Code>
                <Text size="1" color="gray">
                  ${callbackReceipt.total?.amount ?? ""}{" "}
                  {callbackReceipt.currency.toUpperCase()}
                  {callbackReceipt.cardLast4
                    ? ` · ${callbackReceipt.cardBrand ?? "card"} ending ${callbackReceipt.cardLast4}`
                    : ""}
                  {" · "}checked by the server
                </Text>
              </div>
            )}
            <Text size="1" color="gray">
              Paying with a brand-new email moves this tab to Whop&apos;s own
              Payment complete page. Press your browser&apos;s Back button to
              return here, and your receipt will be waiting.
            </Text>
          </div>
        </Panel>

        <Panel step={3} id="verifyStep" title="Verify on the server">
          <div className="flex flex-col gap-3">
            <Text size="2" color="gray" as="p">
              The demo already checked this payment with Whop before showing
              the receipt. Ask Whop again and read its full answer, which comes
              from <Code size="1">payments.retrieve</Code>.
            </Text>
            <Button
              type="button"
              size="2"
              variant="soft"
              disabled={!callbackReceipt || inspectBusy}
              onClick={() => void runInspect()}
            >
              {inspectBusy
                ? "Asking Whop..."
                : callbackReceipt
                  ? "Ask Whop about this payment again"
                  : "Pay in step 2 first"}
            </Button>
            {inspect !== null && (
              <pre className="max-h-72 overflow-auto rounded-lg bg-[#151515] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[#E5E4E0]">
                {JSON.stringify(inspect, null, 2)}
              </pre>
            )}
            <Text size="1" color="gray">
              On a live site Whop can also send this confirmation straight to
              your server.
            </Text>
          </div>
        </Panel>

        <Panel step={4} id="redirect" title="Come back from Whop">
          <div className="flex flex-col gap-3">
            <Text size="2" color="gray" as="p">
              When a payment finishes, Whop can send the buyer back to your
              page with the result in the address bar. These buttons open this
              page at the same address Whop would use.
            </Text>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="2"
                variant="soft"
                disabled={!callbackReceipt}
                onClick={() => {
                  if (!callbackReceipt) return;
                  window.location.assign(
                    `/?payment=${encodeURIComponent(callbackReceipt.id)}&status=succeeded`,
                  );
                }}
              >
                {callbackReceipt ? "Simulate a successful return" : "Simulate a return (pay in step 2 first)"}
              </Button>
              <Button
                type="button"
                size="2"
                variant="soft"
                color="gray"
                onClick={() => window.location.assign("/?status=canceled")}
              >
                Simulate a canceled return
              </Button>
            </div>

            {returnParams && (
              <div className="flex flex-col gap-1.5 rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] px-4 py-3">
                <Text size="2" weight="bold">
                  You just landed back here with:
                </Text>
                <Code size="1" variant="ghost" className="break-all">
                  ?{returnParams.raw}
                </Code>
                <dl className="flex flex-col gap-1">
                  {[
                    ["payment", returnParams.paymentId, "the receipt to double-check"],
                    [
                      "status",
                      returnParams.status,
                      returnParams.status === "succeeded"
                        ? "it worked"
                        : returnParams.status === "failed" || returnParams.status === "canceled"
                          ? "nothing was charged"
                          : "still settling",
                    ],
                  ].map(([key, value, meaning]) =>
                    value ? (
                      <div key={key as string} className="flex flex-wrap items-baseline gap-2">
                        <Code size="1" variant="soft">
                          {key}={value}
                        </Code>
                        <Text size="1" color="gray">
                          {meaning}
                        </Text>
                      </div>
                    ) : null,
                  )}
                </dl>
                {returnParams.status === "succeeded" && redirectReceipt && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge color="green" variant="soft" size="1">
                      verified server-side: {redirectReceipt.status}/
                      {redirectReceipt.substatus ?? ""}
                    </Badge>
                    <Text size="1" color="gray">
                      Your step 2 receipt is still here because the server
                      saved it in a cookie in your browser.
                    </Text>
                  </div>
                )}
                {returnParams.status !== "succeeded" && (
                  <Text size="1" color="gray">
                    Nothing to check. The buyer wasn&apos;t charged, so the
                    page offers to try again.
                  </Text>
                )}
              </div>
            )}
          </div>
        </Panel>

        <Panel step={5} id="breakStep" title="Break it on purpose">
          <div className="flex flex-col gap-3">
            <Text size="2" color="gray" as="p">
              Part A: give the button a plan that doesn&apos;t exist and see
              how Whop answers. A plan is the price of a product on Whop.
            </Text>
            {!foilMounted ? (
              <Button
                type="button"
                size="2"
                variant="soft"
                color="red"
                onClick={() => {
                  log("mount", `<ExpressCheckoutElement /> for ${MISSING_PLAN}`);
                  setFoilMounted(true);
                  setTimeout(() => setFoilQuiet(true), 8000);
                }}
              >
                Use a plan that doesn&apos;t exist
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <Checkout key="missing-plan" plan={MISSING_PLAN} returnUrl={returnUrl}>
                  <ExpressCheckoutElement
                    onError={(e) => {
                      log("onError", e.message);
                      setFoilError(e);
                    }}
                  />
                </Checkout>
                {foilError ? (
                  <Text size="1" color="gray">
                    Whop refused the plan and showed its own notice instead of
                    a button. The page heard about it through{" "}
                    <Code size="1" variant="soft">onError</Code>, with the code{" "}
                    <Code size="1" variant="soft">{foilError.code ?? "none"}</Code>.
                  </Text>
                ) : foilQuiet ? (
                  <Text size="1" color="gray">
                    Nothing reported after 8 seconds. Check the browser console.
                  </Text>
                ) : null}
              </div>
            )}

            <Text size="2" color="gray" as="p">
              Part B: pay in the step 2 form with the decline card{" "}
              <Code size="1">{DECLINE_CARD}</Code>. The form shows the error
              itself, and <Code size="1">onComplete</Code> never runs, so this
              page and the server never hear about a payment.
            </Text>
          </div>
        </Panel>

        <Panel step={6} id="shapes" title="Same product, two shapes">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Button
                type="button"
                size="2"
                variant={shape === "express" ? "solid" : "soft"}
                color={shape === "express" ? "orange" : "gray"}
                onClick={() => setShape("express")}
              >
                Wallet buttons
              </Button>
              <Button
                type="button"
                size="2"
                variant={shape === "form" ? "solid" : "soft"}
                color={shape === "form" ? "orange" : "gray"}
                onClick={() => setShape("form")}
              >
                Full checkout form
              </Button>
            </div>

            {shape === null ? (
              <Text size="1" color="gray">
                Pick a shape to load it for {productTitle}.
              </Text>
            ) : shape === "express" ? (
              <div className="flex flex-col gap-2">
                <Checkout key="shape-express" plan={planId} returnUrl={returnUrl}>
                  <ExpressCheckoutElement />
                </Checkout>
                <Text size="1" color="gray">
                  One press with a wallet, best next to a price. Empty on this
                  demo, because its domain has no Apple Pay set up.
                </Text>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="max-h-[520px] overflow-y-auto rounded-lg border border-[#E5E4E0]">
                  <Checkout
                    key="shape-form"
                    plan={planId}
                    returnUrl={returnUrl}
                    fallback={loading("Loading the full checkout form...")}
                  >
                    <CheckoutElement />
                  </Checkout>
                </div>
                <Text size="1" color="gray">
                  Every payment method in the page, best for a checkout page of
                  its own.
                </Text>
              </div>
            )}
          </div>
        </Panel>

        <ActivityLog entries={entries} />
      </div>
    </WhopElements>
  );
}
