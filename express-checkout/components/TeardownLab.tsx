"use client";

import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  WhopCheckoutEmbed,
  WhopExpressCheckoutButton,
} from "@whop/checkout/react";
import { Badge, Button, Code, Heading, Text } from "@whop/react/components";
import {
  ActivityLog,
  logEntry,
  type ActivityEntry,
} from "@/components/ActivityLog";

export interface ReceiptSummary {
  id: string;
  status: string;
  substatus: string | null;
  total: number;
  currency: string;
  paidAt: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
}

export interface ReturnParams {
  status: string | null;
  paymentId: string | null;
  setupIntentId: string | null;
  stateId: string | null;
  raw: string;
}

const SUCCESS_CARD = "4242 4242 4242 4242";
const DECLINE_CARD = "4000 0000 0000 0002";

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

// Step 5A needs to show whatever ACTUALLY happens when the button mounts
// without its required prop, including a render-time throw.
class MountBoundary extends Component<
  { onError: (message: string) => void; children: ReactNode },
  { failed: string | null }
> {
  state: { failed: string | null } = { failed: null };
  static getDerivedStateFromError(error: unknown) {
    return {
      failed: error instanceof Error ? error.message : String(error),
    };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(
      error instanceof Error ? error.message : String(error),
    );
  }
  render() {
    if (this.state.failed !== null) {
      return (
        <div className="rounded-lg border border-[#E5484D]/30 bg-[#E5484D]/5 px-3 py-2">
          <Text size="1" color="red">
            The button crashed: {this.state.failed}
          </Text>
        </div>
      );
    }
    return this.props.children;
  }
}

const RESOLUTION_ROWS = [
  { key: "apple-pay", browser: "Safari / iOS with Apple Pay", renders: "Native Apple Pay button" },
  { key: "google-pay", browser: "Chrome / Android with Google Pay", renders: "Native Google Pay button" },
  { key: "whop-pay", browser: "Everything else (and all of sandbox)", renders: "Whop Pay button + dialog" },
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
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const [resolved, setResolved] = useState<string | null>(null);
  const [callbackReceipt, setCallbackReceipt] = useState<ReceiptSummary | null>(
    initialCallback,
  );
  const [redirectReceipt, setRedirectReceipt] = useState<ReceiptSummary | null>(
    initialRedirect,
  );
  const [verifying, setVerifying] = useState(false);
  const [inspect, setInspect] = useState<unknown>(null);
  const [inspectBusy, setInspectBusy] = useState(false);
  const [redirectMounted, setRedirectMounted] = useState(false);
  const [redirectVerified, setRedirectVerified] = useState(
    Boolean(initialRedirect),
  );
  const [paymentError, setPaymentError] = useState<{
    message: string;
    code?: string;
  } | null>(null);
  const [foilMounted, setFoilMounted] = useState(false);
  const [foilNote, setFoilNote] = useState<string | null>(null);
  const [shape, setShape] = useState<"express" | "embed">("express");
  const mountedAt = useRef<number | null>(null);
  const mainSlotRef = useRef<HTMLDivElement | null>(null);
  const listenersAttached = useRef(false);

  const log = useCallback((kind: string, detail: string) => {
    setEntries((prev) => [...prev, logEntry(kind, detail)]);
  }, []);

  const offset = useCallback(() => {
    if (!mountedAt.current) return "";
    return ` (+${Date.now() - mountedAt.current}ms)`;
  }, []);

  // The custom element under the React wrapper dispatches DOM events the
  // wrapper doesn't expose as props; tap them for the wire log.
  useEffect(() => {
    if (!mounted || listenersAttached.current) return;
    let tries = 0;
    const timer = setInterval(() => {
      const el = mainSlotRef.current?.querySelector(
        "whop-express-checkout-button",
      );
      if (el) {
        clearInterval(timer);
        if (listenersAttached.current) return;
        listenersAttached.current = true;
        for (const event of ["ready", "overlay-open", "overlay-close"]) {
          el.addEventListener(event, () => {
            log(`element.${event}`, `fired${offset()}`);
          });
        }
      } else if (tries++ > 40) {
        clearInterval(timer);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [log, mounted, offset]);

  const verifyReceipt = useCallback(
    async (
      receiptId: string,
      path: "callback" | "redirect",
      stateId?: string,
    ): Promise<ReceiptSummary | null> => {
      setVerifying(true);
      try {
        for (let attempt = 0; attempt < 10; attempt++) {
          const res = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ receiptId, path, stateId }),
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

  // Step 4: when the page just returned from a redirect completion, verify
  // the payment_id from the query string server-side.
  const redirectHandled = useRef(false);
  useEffect(() => {
    if (!returnParams || redirectHandled.current) return;
    redirectHandled.current = true;
    log(
      "return-url",
      `landed with ${returnParams.raw || "(no query params)"}`,
    );
    if (returnParams.status === "success" && returnParams.paymentId) {
      void verifyReceipt(
        returnParams.paymentId,
        "redirect",
        returnParams.stateId ?? undefined,
      ).then((r) => {
        if (r) {
          setRedirectReceipt(r);
          setRedirectVerified(true);
        }
      });
    }
  }, [log, returnParams, verifyReceipt]);

  const handleComplete = useCallback(
    (completedPlanId: string, receiptId?: string) => {
      log(
        "onComplete",
        `(${completedPlanId}, ${receiptId ?? "undefined"})${offset()}`,
      );
      if (!receiptId) return;
      void verifyReceipt(receiptId, "callback").then((r) => {
        if (r) setCallbackReceipt(r);
      });
    },
    [log, offset, verifyReceipt],
  );

  const handlePaymentError = useCallback(
    (error: { message: string; code?: string }) => {
      log(
        "onPaymentError",
        `${error.message}${error.code ? ` [${error.code}]` : ""}${offset()}`,
      );
      setPaymentError(error);
    },
    [log, offset],
  );

  const handleResolved = useCallback(
    (info: { rendered: string }) => {
      log("onExpressMethodResolved", `rendered: "${info.rendered}"${offset()}`);
      setResolved(info.rendered);
    },
    [log, offset],
  );

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

  const jsxSnippet = `<WhopExpressCheckoutButton
  planId="${planId}"
  returnUrl="${returnUrl}"
  onComplete={(planId, receiptId) => verify(receiptId)}
/>`;

  const fallbackSkeleton = (
    <div className="flex h-11 w-full max-w-xs items-center justify-center rounded-lg bg-[#151515]/10">
      <Text size="1" color="gray">
        Picking a payment method...
      </Text>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <Panel step={1} id="mount" title="Add the button, watch it decide">
        <div className="flex flex-col gap-3">
          <Text size="2" color="gray" as="p">
            One line of code adds the button. Watch it pick the best way to
            pay for this browser.
          </Text>
          <pre className="overflow-x-auto rounded-lg bg-[#151515] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[#E5E4E0]">
            {jsxSnippet}
          </pre>

          <div className="flex flex-col gap-1">
            {RESOLUTION_ROWS.map((row) => {
              const active = resolved === row.key;
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
                      YOUR BROWSER
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
                mountedAt.current = Date.now();
                log("mount", `<WhopExpressCheckoutButton planId="${planId}" />`);
                setMounted(true);
              }}
            >
              Add the button
            </Button>
          ) : (
            <div className="flex flex-col gap-2" ref={mainSlotRef}>
              <WhopExpressCheckoutButton
                planId={planId}
                returnUrl={returnUrl}
                environment={environment}
                theme="light"
                themeOptions={{ accentColor: "orange" }}
                onComplete={handleComplete}
                onPaymentError={handlePaymentError}
                onExpressMethodResolved={handleResolved}
                fallback={fallbackSkeleton}
              />
              <Text size="1" color="gray">
                The real button for {productTitle} (${price}). Apple Pay and
                Google Pay only appear on live sites, so on this test sandbox
                you always get the Whop Pay button.
              </Text>
            </div>
          )}
        </div>
      </Panel>

      <Panel step={2} id="dialog" title="Buy through the popup">
        <div className="flex flex-col gap-3">
          <Text size="2" color="gray" as="p">
            Click the button above and pay with{" "}
            <Code size="1">{SUCCESS_CARD}</Code> (any future expiry, any CVC).
            Checkout opens in a popup and you never leave this page.
          </Text>
          {verifying && (
            <Text size="1" color="gray">
              Double-checking the payment with Whop...
            </Text>
          )}
          {callbackReceipt && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Text size="2" weight="bold">
                  Receipt (popup path)
                </Text>
                <Badge color="green" variant="soft" size="1">
                  {callbackReceipt.status}/{callbackReceipt.substatus ?? ""}
                </Badge>
              </div>
              <Code size="1" variant="ghost" className="break-all">
                {callbackReceipt.id}
              </Code>
              <Text size="1" color="gray">
                ${callbackReceipt.total}{" "}
                {callbackReceipt.currency.toUpperCase()}
                {callbackReceipt.cardLast4
                  ? ` · ${callbackReceipt.cardBrand ?? "card"} ending ${callbackReceipt.cardLast4}`
                  : ""}
                {" · "}you never left the page
              </Text>
            </div>
          )}
        </div>
      </Panel>

      <Panel step={3} id="verifyStep" title="Verify on the server">
        <div className="flex flex-col gap-3">
          <Text size="2" color="gray" as="p">
            The demo already double-checked this payment with Whop before
            showing the receipt. Run that check again and read the raw
            answer.
          </Text>
          <Button
            type="button"
            size="2"
            variant="soft"
            disabled={!callbackReceipt || inspectBusy}
            onClick={() => void runInspect()}
          >
            {inspectBusy
              ? "Retrieving..."
              : callbackReceipt
                ? `Run payments.retrieve("${callbackReceipt.id.slice(0, 10)}...")`
                : "Run payments.retrieve (buy in step 2 first)"}
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

      <Panel step={4} id="redirect" title="Leave the page and come back">
        <div className="flex flex-col gap-3">
          <Text size="2" color="gray" as="p">
            This copy of the button works the other way. After you pay, the
            browser leaves the page and comes back with the result in the
            address bar, so buy again with{" "}
            <Code size="1">{SUCCESS_CARD}</Code> and watch it happen.
          </Text>
          {!redirectMounted ? (
            <Button
              type="button"
              size="2"
              variant="soft"
              onClick={() => {
                log("mount", "redirect-mode instance (no onComplete)");
                setRedirectMounted(true);
              }}
            >
              Add the second button
            </Button>
          ) : (
            <WhopExpressCheckoutButton
              planId={planId}
              returnUrl={returnUrl}
              environment={environment}
              theme="light"
              themeOptions={{ accentColor: "orange" }}
              fallback={fallbackSkeleton}
            />
          )}

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
                  [
                    "status",
                    returnParams.status,
                    returnParams.status === "success"
                      ? "it worked"
                      : "it failed or was canceled",
                  ],
                  [
                    "payment_id",
                    returnParams.paymentId,
                    "the receipt to double-check",
                  ],
                  ["state_id", returnParams.stateId, "the checkout session"],
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
              {redirectVerified && redirectReceipt && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge color="green" variant="soft" size="1">
                    verified server-side: {redirectReceipt.status}/
                    {redirectReceipt.substatus ?? ""}
                  </Badge>
                  <Text size="1" color="gray">
                    Your progress survived the trip because it lives in a
                    cookie, not the page.
                  </Text>
                </div>
              )}
            </div>
          )}
          {!returnParams && redirectReceipt && (
            <div className="rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] px-4 py-3">
              <Text size="1" color="gray">
                You already did this round trip. Receipt {redirectReceipt.id}{" "}
                is verified in your session.
              </Text>
            </div>
          )}
        </div>
      </Panel>

      <Panel step={5} id="breakStep" title="Break it on purpose">
        <div className="flex flex-col gap-3">
          <Text size="2" color="gray" as="p">
            Part A: the button will not appear without returnUrl, an address
            to send you back to. Leave it out and see what happens.
          </Text>
          {!foilMounted ? (
            <Button
              type="button"
              size="2"
              variant="soft"
              color="red"
              onClick={() => {
                log("mount", "instance WITHOUT returnUrl (required prop omitted)");
                // The element reports this failure to the console, not the
                // page. Tap console.error briefly so the REAL message lands
                // in the wire log.
                const original = console.error;
                console.error = (...args: unknown[]) => {
                  const text = args.map(String).join(" ");
                  if (text.includes("whop-checkout") || text.includes("return-url")) {
                    log("console.error", text);
                    setFoilNote(
                      "The button quietly refused to appear. Its complaint went to the browser console, not the page.",
                    );
                  }
                  original(...args);
                };
                setTimeout(() => {
                  console.error = original;
                  setFoilNote(
                    (current) =>
                      current ??
                      "Nothing reported after 3 seconds, check the browser console.",
                  );
                }, 3000);
                setFoilMounted(true);
              }}
            >
              Add it without returnUrl
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <MountBoundary
                onError={(message) => {
                  log("mount-error", message);
                  setFoilNote(`The button crashed: ${message}`);
                }}
              >
                {(() => {
                  const Loose = WhopExpressCheckoutButton as unknown as (
                    props: Record<string, unknown>,
                  ) => ReactNode;
                  return (
                    <Loose
                      planId={planId}
                      environment={environment}
                      theme="light"
                      fallback={fallbackSkeleton}
                      onPaymentError={handlePaymentError}
                      onExpressMethodResolved={(info: { rendered: string }) =>
                        log(
                          "onExpressMethodResolved",
                          `foil instance rendered: "${info.rendered}"`,
                        )
                      }
                    />
                  );
                })()}
              </MountBoundary>
              {foilNote && (
                <Text size="1" color="gray">
                  {foilNote}
                </Text>
              )}
            </div>
          )}

          <Text size="2" color="gray" as="p">
            Part B: pay in the step 1 popup with the decline card{" "}
            <Code size="1">{DECLINE_CARD}</Code>. The failure lands in the
            log and right here:
          </Text>
          {paymentError ? (
            <div className="rounded-lg border border-[#E5484D]/30 bg-[#E5484D]/5 px-4 py-3">
              <Text size="2" color="red" as="p">
                onPaymentError: {paymentError.message}
                {paymentError.code ? ` [code: ${paymentError.code}]` : ""}
              </Text>
              <Text size="1" color="gray">
                On the leave-and-return path this comes back as
                ?status=error instead.
              </Text>
            </div>
          ) : (
            <Text size="1" color="gray">
              No payment errors caught yet.
            </Text>
          )}
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
              Express button
            </Button>
            <Button
              type="button"
              size="2"
              variant={shape === "embed" ? "solid" : "soft"}
              color={shape === "embed" ? "orange" : "gray"}
              onClick={() => setShape("embed")}
            >
              Embedded checkout
            </Button>
          </div>

          {shape === "express" ? (
            <div className="flex flex-col gap-2">
              <WhopExpressCheckoutButton
                key="shape-express"
                planId={planId}
                returnUrl={returnUrl}
                environment={environment}
                theme="light"
                themeOptions={{ accentColor: "orange" }}
                fallback={fallbackSkeleton}
              />
              <Text size="1" color="gray">
                One button that opens a popup checkout, best for pricing
                cards.
              </Text>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="max-h-[520px] overflow-y-auto rounded-lg border border-[#E5E4E0]">
                <WhopCheckoutEmbed
                  key="shape-embed"
                  planId={planId}
                  environment={environment}
                  returnUrl={returnUrl}
                  theme="light"
                  themeOptions={{ accentColor: "orange" }}
                  fallback={
                    <div className="flex h-40 items-center justify-center">
                      <Text size="2" color="gray">
                        Loading the full checkout form...
                      </Text>
                    </div>
                  }
                />
              </div>
              <Text size="1" color="gray">
                The full form in the page, best for a dedicated checkout
                page.
              </Text>
            </div>
          )}
        </div>
      </Panel>

      <ActivityLog entries={entries} />
    </div>
  );
}
