"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import type { AccentColor } from "@whop/checkout/react";
import { Button } from "@whop/react/components";
import BrandIcon from "@/components/BrandIcon";
import { X, Check } from "@/components/Icons";

type Step = "loading" | "checkout" | "free" | "done" | "error";

export default function CheckoutModal({
  open,
  onClose,
  body,
  creatorUsername,
  creatorDisplayName,
  accentColor,
  sandbox,
}: {
  open: boolean;
  onClose: () => void;
  body: Record<string, unknown>;
  creatorUsername: string;
  creatorDisplayName: string;
  accentColor: string;
  sandbox: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [checkout, setCheckout] = useState<{ sessionId: string; planId: string; ref: string } | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const startedRef = useRef(false);
  const confirmTriedRef = useRef(false);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  // Reset and create a fresh checkout configuration whenever the modal opens.
  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      confirmTriedRef.current = false;
      setStep("loading");
      setCheckout(null);
      setDownloadUrl(null);
      setError(null);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not start checkout");
          setStep("error");
          return;
        }
        if (data.free) {
          setDownloadUrl(data.downloadUrl ?? null);
          setStep("free");
          return;
        }
        setCheckout({ sessionId: data.sessionId, planId: data.planId, ref: data.ref });
        setStep("checkout");
      } catch {
        setError("Network error. Please try again.");
        setStep("error");
      }
    })();
  }, [open, body]);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="kofi-card w-full max-w-md p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-bold">
            {step === "done" ? "Thank you!" : step === "free" ? "You're all set" : `Support ${creatorDisplayName}`}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "loading" ? (
          <div className="py-10 text-center text-sm text-muted">Starting secure checkout…</div>
        ) : null}

        {step === "error" ? (
          <div className="py-8 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button size="2" variant="soft" color="gray" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : null}

        {step === "free" ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-positive/15 text-positive">
              <Check className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold">You&apos;re all set — download ready</p>
            {downloadUrl ? (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pill btn-accent mt-4 w-full"
              >
                Download
              </a>
            ) : (
              <p className="mt-2 text-sm text-muted">Check your account for delivery details.</p>
            )}
            <Button size="3" variant="soft" color="gray" className="mt-3 w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-positive/15">
              <BrandIcon name="confetti" className="h-8 w-8" />
            </div>
            <p className="text-sm text-muted">Your support means a lot to {creatorDisplayName}.</p>
            <Button size="3" variant="solid" className="mt-4 w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : null}

        {step === "checkout" && checkout ? (
          <div className="overflow-hidden">
            <WhopCheckoutEmbed
              sessionId={checkout.sessionId}
              planId={checkout.planId}
              theme={theme === "dark" ? "dark" : "light"}
              themeOptions={{ accentColor: accentColor as AccentColor }}
              environment={sandbox ? "sandbox" : "production"}
              onComplete={onComplete}
              fallback={<div className="py-10 text-center text-sm text-muted">Loading secure checkout…</div>}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
