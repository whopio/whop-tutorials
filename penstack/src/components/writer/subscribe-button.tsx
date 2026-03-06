"use client";

import { useState } from "react";
import { CreditCard, Check, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { DemoModal } from "@/components/demo/demo-modal";

interface SubscribeButtonProps {
  writerId: string;
  writerName: string;
  price: number; // in cents
  isSubscribed?: boolean;
  hasCheckout?: boolean;
}

export function SubscribeButton({
  writerId,
  writerName,
  price,
  isSubscribed,
  hasCheckout,
}: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  if (isSubscribed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
        <Check className="h-4 w-4" />
        Subscribed
      </span>
    );
  }

  async function handleSubscribe() {
    if (!hasCheckout) {
      setShowDemo(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writerId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert("Failed to create checkout session. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoConfirm() {
    setShowDemo(false);
    setLoading(true);
    try {
      const res = await fetch("/api/demo/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writerId }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      alert("Demo subscription failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="mr-1.5 h-4 w-4" />
        )}
        Subscribe {formatPrice(price)}/mo
      </button>
      <DemoModal
        isOpen={showDemo}
        onClose={() => setShowDemo(false)}
        onConfirm={handleDemoConfirm}
      />
    </>
  );
}
