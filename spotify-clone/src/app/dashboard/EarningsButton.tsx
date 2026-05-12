"use client";

import { useActionState } from "react";
import { enableEarnings } from "@/app/actions/earnings";

interface EarningsButtonProps {
  enrolled: boolean;
  payoutEnabled: boolean;
}

const initialState = { message: "" };

export function EarningsButton({ enrolled, payoutEnabled }: EarningsButtonProps) {
  const [state, action, pending] = useActionState(enableEarnings, initialState);

  if (payoutEnabled) {
    return (
      <div
        className="flex items-center justify-between p-4 rounded-xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(52,211,153,0.15)" }}
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Earnings enabled</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Ready to receive payments</p>
          </div>
        </div>
        <form action={action}>
          <button
            type="submit"
            disabled={pending}
            className="text-sm font-medium px-4 py-2 rounded-full transition-colors disabled:opacity-40"
            style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}
          >
            {pending ? "Loading…" : "Manage"}
          </button>
        </form>
      </div>
    );
  }

  if (enrolled) {
    return (
      <div className="space-y-3">
        <div
          className="flex items-start gap-3 p-4 rounded-xl"
          style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
        >
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="#fbbf24" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#fde68a" }}>Onboarding incomplete</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(253,230,138,0.7)" }}>
              Complete your payout setup to start receiving payments.
            </p>
          </div>
        </div>
        <form action={action}>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-full disabled:opacity-50"
            style={{ background: "#7c3aed" }}
          >
            {pending ? "Loading…" : "Complete onboarding"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
        Enable earnings to set prices on your tracks and get paid directly by listeners.
      </p>
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-full disabled:opacity-50"
          style={{ background: "#7c3aed" }}
        >
          {pending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Setting up…
            </>
          ) : "Enable Earnings"}
        </button>
      </form>
      {state.message && <p className="text-sm text-red-400">{state.message}</p>}
    </div>
  );
}
