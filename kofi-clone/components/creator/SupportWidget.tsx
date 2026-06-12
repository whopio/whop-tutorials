"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import type { AccentColor } from "@whop/checkout/react";
import { Button, TextField, TextArea } from "@whop/react/components";
import BrandIcon from "@/components/BrandIcon";
import { ChevronLeft } from "@/components/Icons";

const COFFEE_UNIT_CENTS = 500;
const PRESETS = [1, 3, 5];

type Step = "form" | "checkout" | "done";

export default function SupportWidget({
  creatorUsername,
  creatorDisplayName,
  accentColor,
  sandbox,
  hasMemberships,
}: {
  creatorUsername: string;
  creatorDisplayName: string;
  accentColor: string;
  sandbox: boolean;
  hasMemberships: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"once" | "membership">("once");
  const [coffees, setCoffees] = useState(1);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [checkout, setCheckout] = useState<{ sessionId: string; planId: string; ref: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const confirmTriedRef = useRef(false);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const customCents = custom ? Math.round(parseFloat(custom) * 100) : 0;
  const amountCents = customCents > 0 ? customCents : coffees * COFFEE_UNIT_CENTS;
  const amountLabel = `$${(amountCents / 100).toFixed(amountCents % 100 === 0 ? 0 : 2)}`;

  async function startCheckout() {
    setError(null);
    if (amountCents < 100) {
      setError("Please choose an amount of at least $1.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorUsername,
          kind: "tip",
          amountCents,
          supporterName: name || undefined,
          message: message || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout");
        setLoading(false);
        return;
      }
      setCheckout({ sessionId: data.sessionId, planId: data.planId, ref: data.ref });
      setStep("checkout");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onComplete() {
    if (!checkout || confirmTriedRef.current) return;
    confirmTriedRef.current = true;
    setStep("done");
    // Confirm against Whop (a few retries while the payment settles).
    for (let i = 0; i < 5; i++) {
      try {
        const res = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref: checkout.ref, creatorUsername }),
        });
        const data = await res.json();
        if (data.ok) break;
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    router.refresh();
  }

  if (step === "done") {
    return (
      <div className="kofi-card p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-positive/15">
          <BrandIcon name="confetti" className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold">Thank you!</h3>
        <p className="mt-1 text-sm text-muted">
          Your support means a lot to {creatorDisplayName}.
        </p>
        <Button
          size="2"
          variant="soft"
          color="gray"
          className="mt-4"
          onClick={() => {
            setStep("form");
            setCheckout(null);
            confirmTriedRef.current = false;
            setCustom("");
            setMessage("");
          }}
        >
          Send another
        </Button>
      </div>
    );
  }

  if (step === "checkout" && checkout) {
    return (
      <div className="kofi-card overflow-hidden p-4">
        <button className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-muted" onClick={() => setStep("form")}>
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <WhopCheckoutEmbed
          sessionId={checkout.sessionId}
          planId={checkout.planId}
          theme={theme}
          themeOptions={{ accentColor: accentColor as AccentColor }}
          environment={sandbox ? "sandbox" : "production"}
          returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/${creatorUsername}?status=success`}
          onComplete={onComplete}
          fallback={<div className="py-10 text-center text-sm text-muted">Loading secure checkout…</div>}
        />
      </div>
    );
  }

  return (
    <div className="kofi-card p-5">
      <h2 className="text-lg font-bold">Show {creatorDisplayName} some love</h2>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1 text-sm font-semibold">
        <button
          onClick={() => setMode("once")}
          className={`rounded-full py-2 transition ${mode === "once" ? "bg-surface shadow-sm" : "text-muted"}`}
        >
          One time
        </button>
        <button
          onClick={() => setMode("membership")}
          className={`rounded-full py-2 transition ${mode === "membership" ? "bg-surface shadow-sm" : "text-muted"}`}
        >
          Membership
        </button>
      </div>

      {mode === "membership" ? (
        <div className="mt-5 text-center">
          <p className="text-sm text-muted">
            {hasMemberships
              ? "Join a monthly membership for exclusive perks."
              : `${creatorDisplayName} hasn't set up memberships yet.`}
          </p>
          {hasMemberships ? (
            <Link href={`/${creatorUsername}/membership`} className="btn-pill btn-accent mt-4 w-full">
              See membership options
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm font-semibold">Choose amount</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {PRESETS.map((n) => {
              const active = customCents === 0 && coffees === n;
              return (
                <button
                  key={n}
                  onClick={() => {
                    setCoffees(n);
                    setCustom("");
                  }}
                  className="btn-pill inline-flex items-center justify-center gap-1.5 border text-sm"
                  style={
                    active
                      ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                      : { borderColor: "var(--line)" }
                  }
                >
                  <BrandIcon name="coffee" className="h-5 w-5" />
                  <span>${(n * COFFEE_UNIT_CENTS) / 100}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted">or enter an amount</span>
            <div className="flex flex-1 items-center rounded-full border border-line px-3 py-1.5">
              <span className="text-muted">$</span>
              <input
                type="number"
                min={1}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="10"
                className="w-full bg-transparent pl-1 outline-none"
              />
            </div>
          </div>

          <TextField.Root size="3" className="mt-3">
            <TextField.Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
            />
          </TextField.Root>
          <TextArea
            className="mt-2"
            size="3"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Say something nice (optional)"
          />

          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

          <Button onClick={startCheckout} disabled={loading} size="3" variant="solid" className="mt-3 w-full">
            {loading ? "Starting…" : `Support ${amountLabel}`}
          </Button>
          <p className="mt-2 text-center text-xs text-muted">
            Every payment goes straight to {creatorDisplayName}.
          </p>
        </>
      )}
    </div>
  );
}
