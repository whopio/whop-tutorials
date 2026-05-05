"use client";

import { useActionState, useEffect, useState } from "react";
import { enableEarnings } from "@/app/actions/earnings";

const IS_SANDBOX = process.env.NEXT_PUBLIC_WHOP_ENV === "sandbox";

const primaryBtn =
  "rounded-lg py-2.5 px-6 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-colors";

const ghostBtn =
  "rounded-lg px-5 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors";

export function EarningsButton({
  enrolled,
  payoutEnabled,
}: {
  enrolled: boolean;
  payoutEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(enableEarnings, {
    error: "",
  });
  const [showSandboxNotice, setShowSandboxNotice] = useState(false);

  // In sandbox, intercept the click and show an explanation popup before
  // actually triggering the server action. Production flow goes straight to
  // KYC as usual.
  function handleSubmit(e: React.MouseEvent<HTMLButtonElement>) {
    if (!IS_SANDBOX) return;
    if (showSandboxNotice) return;
    e.preventDefault();
    setShowSandboxNotice(true);
  }

  // Close the modal once the server action completes successfully so the user
  // sees the green "Earnings enabled" state immediately.
  useEffect(() => {
    if (state?.success) setShowSandboxNotice(false);
  }, [state?.success]);

  const renderForm = (label: string, pendingLabel: string) => (
    <form action={action}>
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={pending}
        className={primaryBtn}
      >
        {pending ? pendingLabel : label}
      </button>
    </form>
  );

  return (
    <div className="rounded-xl border border-dashed border-neutral-200 p-6">
      {payoutEnabled ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs flex-shrink-0 bg-neutral-900"
              aria-hidden
            >
              ✓
            </span>
            <p className="text-sm font-medium text-neutral-900">
              Earnings enabled. Your connected account is set up.
            </p>
          </div>
          <form action={action}>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={pending}
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50 underline underline-offset-4"
            >
              {pending ? "Opening..." : "Manage account onboarding"}
            </button>
          </form>
        </div>
      ) : enrolled ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <span
              className="text-amber-500 text-sm leading-none mt-0.5"
              aria-hidden
            >
              ⚠
            </span>
            <p className="text-sm text-amber-700 font-medium">
              Account created but KYC not complete. Finish onboarding to accept
              payments.
            </p>
          </div>
          {renderForm("Complete onboarding", "Opening...")}
        </div>
      ) : (
        <div className="text-center space-y-4">
          <p className="text-sm text-neutral-600">
            Enable earnings to accept payments for premium links.
          </p>
          {renderForm("Enable earnings", "Setting up...")}
        </div>
      )}

      {state?.error && (
        <p className="text-sm text-red-600 mt-3">{state.error}</p>
      )}

      {showSandboxNotice && (
        <SandboxBypassModal
          onCancel={() => setShowSandboxNotice(false)}
          formAction={action}
          pending={pending}
        />
      )}
    </div>
  );
}

function SandboxBypassModal({
  onCancel,
  formAction,
  pending,
}: {
  onCancel: () => void;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/30 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sandbox-bypass-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-200">
        <h3
          id="sandbox-bypass-title"
          className="text-lg font-semibold text-neutral-900 mb-2 tracking-tight"
        >
          Sandbox demo. KYC skipped.
        </h3>
        <p className="text-sm text-neutral-600 leading-relaxed mb-3">
          On the production version of this project, clicking{" "}
          <span className="font-medium text-neutral-900">Enable earnings</span>{" "}
          would send you to Whop&apos;s hosted KYC flow to verify your identity
          and connect a payout method.
        </p>
        <p className="text-sm text-neutral-600 leading-relaxed mb-6">
          Since this demo runs against the Whop sandbox, no real KYC is needed.
          Continuing will mark your account as payout-ready instantly so you
          can test the rest of the flow.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={ghostBtn}>
            Cancel
          </button>
          <form action={formAction}>
            <button type="submit" disabled={pending} className={primaryBtn}>
              {pending ? "Enabling..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
