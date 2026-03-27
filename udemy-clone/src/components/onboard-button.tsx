"use client";

import { useState } from "react";

export function OnboardButton({ hasProfile }: { hasProfile: boolean }) {
  const [loading, setLoading] = useState(false);
  const [sandboxMessage, setSandboxMessage] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/teach/onboard", { method: "POST" });
      const data = await res.json();
      if (data.sandbox) {
        setSandboxMessage(true);
        setTimeout(() => {
          window.location.href = "/teach/dashboard";
        }, 2000);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  if (sandboxMessage) {
    return (
      <div className="rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 p-5 text-center">
        <p className="text-[var(--color-success)] font-medium mb-1">You&apos;re all set!</p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Since this demo uses the Whop sandbox, KYC is not required. Redirecting to your dashboard...
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-8 py-4 rounded-lg bg-[var(--color-accent)] text-white text-lg font-semibold hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
    >
      {loading
        ? "Setting up..."
        : hasProfile
          ? "Complete Verification"
          : "Become an Instructor"}
    </button>
  );
}
