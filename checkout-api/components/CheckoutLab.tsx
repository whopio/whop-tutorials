"use client";

import { useCallback, useState } from "react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Badge, Button, Code, Heading, Text } from "@whop/react/components";
import { ActivityLog, logEntry, type ActivityEntry } from "@/components/ActivityLog";

export interface PlanInfo {
  productId: string;
  productTitle: string;
  planId: string;
  priceLabel: string;
  planType: string;
}

interface SessionInfo {
  id: string;
  metadata: Record<string, string> | null;
  purchaseUrl: string;
}

interface Receipt {
  id: string;
  status: string;
  substatus: string | null;
  total: number | null;
  currency: string;
  metadata: Record<string, string> | null;
  cardBrand: string | null;
  cardLast4: string | null;
}

const VERIFY_ATTEMPTS = 10;
const VERIFY_DELAY_MS = 2000;

function Panel({
  step,
  id,
  title,
  children,
}: {
  step: number;
  id: string;
  title: string;
  children: React.ReactNode;
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

export function CheckoutLab({
  plan,
  environment,
  returnUrl,
  initialOrderId,
}: {
  plan: PlanInfo;
  environment: "production" | "sandbox";
  returnUrl: string;
  initialOrderId: string;
}) {
  const [orderId] = useState(initialOrderId);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [replayId, setReplayId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<ActivityEntry[]>([]);

  const note = useCallback((kind: string, detail: string) => {
    setLog((entries) => [...entries, logEntry(kind, detail)]);
  }, []);

  const createSession = useCallback(
    async (isReplay: boolean) => {
      setBusy(isReplay ? "replay" : "create");
      setError(null);
      note(
        "POST /checkout_configurations",
        `metadata.order_id=${orderId}${isReplay ? " (same idempotency key)" : ""}`,
      );

      try {
        const response = await fetch("/api/demo/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        if (!response.ok) {
          setError("Whop would not make the checkout. Try again.");
          setBusy(null);
          return;
        }

        const data = (await response.json()) as SessionInfo;
        note("<- checkout", data.id);
        if (isReplay) setReplayId(data.id);
        else setSession(data);
      } catch {
        setError("We could not reach the server.");
      }

      setBusy(null);
    },
    [orderId, note],
  );

  const verify = useCallback(
    async (receiptId: string) => {
      setBusy("verify");
      note("embed.onComplete", receiptId);

      for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt++) {
        note("POST /payments/retrieve", `${receiptId}, asking Whop`);

        const response = await fetch("/api/demo/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receiptId }),
        });

        if (response.ok) {
          const data = (await response.json()) as { receipt: Receipt };
          note("<- payment", `${data.receipt.id} ${data.receipt.status}`);
          setReceipt(data.receipt);
          setBusy(null);
          return;
        }

        if (response.status === 202) {
          note("<- payment", "still settling, asking again");
          await new Promise((resolve) => setTimeout(resolve, VERIFY_DELAY_MS));
          continue;
        }

        setError("Whop could not confirm that payment.");
        setBusy(null);
        return;
      }

      setError("Whop is taking longer than usual to confirm this payment.");
      setBusy(null);
    },
    [note],
  );

  const handleComplete = useCallback(
    (_planId: string, receiptId?: string) => {
      if (!receiptId) {
        setError("The checkout finished but no receipt came back.");
        return;
      }
      void verify(receiptId);
    },
    [verify],
  );

  return (
    <div className="flex flex-col gap-4">
      <Panel step={1} id="catalogue" title="What we are selling">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="gray">Product</Badge>
            <Code size="1" variant="soft">
              {plan.productId}
            </Code>
            <Text size="2">{plan.productTitle}</Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="gray">Plan</Badge>
            <Code size="1" variant="soft">
              {plan.planId}
            </Code>
            <Text size="2">
              {plan.priceLabel}, {plan.planType}
            </Text>
          </div>
          <Text size="1" color="gray" as="p">
            Both were made with two terminal commands, then read back from Whop just now.
          </Text>
        </div>
      </Panel>

      <Panel step={2} id="order" title="Our own order number">
        <div className="flex flex-col gap-2">
          <Code size="2" variant="soft">
            {orderId}
          </Code>
          <Text size="1" color="gray" as="p">
            Ours, not Whop&apos;s. A real app would write a row in its database and use that
            row&apos;s id here.
          </Text>
        </div>
      </Panel>

      <Panel step={3} id="session" title="Tag a checkout with it">
        {session ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="green">Made</Badge>
              <Code size="1" variant="soft">
                {session.id}
              </Code>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Text size="2">Carries</Text>
              <Code size="1" variant="soft">
                {JSON.stringify(session.metadata)}
              </Code>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Text size="2" color="gray" as="p">
              We attach the order number now, before the buyer sees a payment form.
            </Text>
            <Button
              type="button"
              size="2"
              disabled={busy === "create"}
              onClick={() => void createSession(false)}
              className="w-fit"
            >
              {busy === "create" ? "Asking Whop" : "Make the checkout"}
            </Button>
          </div>
        )}
      </Panel>

      <Panel step={4} id="replay" title="Ask twice, get one">
        {replayId && session ? (
          <div className="flex flex-wrap items-center gap-2">
            <Code size="1" variant="soft">
              {replayId}
            </Code>
            <Badge color={replayId === session.id ? "green" : "red"}>
              {replayId === session.id ? "the same one" : "a different one"}
            </Badge>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Text size="2" color="gray" as="p">
              The same request, sent again. A second checkout would mean a second chance to
              be charged.
            </Text>
            <Button
              type="button"
              size="2"
              variant="soft"
              color="gray"
              disabled={!session || busy === "replay"}
              onClick={() => void createSession(true)}
              className="w-fit"
            >
              {busy === "replay" ? "Asking again" : "Send it again"}
            </Button>
          </div>
        )}
      </Panel>

      <Panel step={5} id="pay" title="Pay without leaving">
        {!session ? (
          <Text size="2" color="gray" as="p">
            Make the checkout in step 3 first.
          </Text>
        ) : receipt ? (
          <div className="flex items-center gap-2">
            <Badge color="green">Paid</Badge>
            <Text size="2">This checkout is done.</Text>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Text size="2" color="gray" as="p">
              Card <Code size="1" variant="soft">4242 4242 4242 4242</Code>, any future
              date, any three digits.
            </Text>
            <div className="overflow-hidden rounded-lg border border-[#E5E4E0]">
              <WhopCheckoutEmbed
                sessionId={session.id}
                environment={environment}
                returnUrl={returnUrl}
                theme="light"
                themeOptions={{ accentColor: "orange" }}
                onComplete={handleComplete}
                fallback={
                  <div className="flex h-64 items-center justify-center">
                    <Text size="2" color="gray">
                      Loading the checkout
                    </Text>
                  </div>
                }
              />
            </div>
          </div>
        )}
      </Panel>

      <Panel step={6} id="receipt" title="The payment knows our number">
        {receipt ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="green">{receipt.status}</Badge>
              <Code size="1" variant="soft">
                {receipt.id}
              </Code>
              {receipt.total !== null ? (
                <Text size="2">
                  {receipt.total} {receipt.currency.toUpperCase()}
                </Text>
              ) : null}
            </div>
            {receipt.cardLast4 ? (
              <Text size="2" color="gray">
                Paid with {receipt.cardBrand ?? "card"} ending {receipt.cardLast4}
              </Text>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Text size="2">Came back with</Text>
              <Code size="1" variant="soft">
                {JSON.stringify(receipt.metadata)}
              </Code>
            </div>
            <Text size="1" color="gray" as="p">
              We stored nothing. The number went out on the checkout and came back on the
              payment, which is how a real app knows which sale to fulfil.
            </Text>
          </div>
        ) : busy === "verify" ? (
          <Text size="2" color="gray" as="p">
            Asking Whop what that payment was.
          </Text>
        ) : (
          <Text size="2" color="gray" as="p">
            Pay in step 5 and the answer lands here.
          </Text>
        )}
      </Panel>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <Text size="2" color="red" as="p">
            {error}
          </Text>
        </div>
      ) : null}

      <ActivityLog entries={log} />
    </div>
  );
}
