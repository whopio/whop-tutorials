"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Status = "ACTIVE" | "PAUSED" | "CANCELED" | "EXPIRED";
type Action = "pause" | "resume" | "cancel" | "uncancel";

const LABELS: Record<Action, { default: string; pending: string; confirm: string }> = {
  pause: { default: "Pause", pending: "Pausing…", confirm: "Confirm pause" },
  resume: { default: "Resume", pending: "Resuming…", confirm: "" },
  cancel: { default: "Cancel membership", pending: "Canceling…", confirm: "Confirm cancel" },
  uncancel: { default: "Uncancel", pending: "Uncanceling…", confirm: "" },
};

export function MembershipActions({
  status,
  cancelAtPeriodEnd,
}: {
  status: Status;
  cancelAtPeriodEnd: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {status === "ACTIVE" && !cancelAtPeriodEnd && (
        <>
          <ActionButton action="pause" />
          <ActionButton action="cancel" variant="danger" />
        </>
      )}
      {status === "ACTIVE" && cancelAtPeriodEnd && (
        <ActionButton action="uncancel" variant="brand" />
      )}
      {status === "PAUSED" && <ActionButton action="resume" variant="brand" />}
    </div>
  );
}

function ActionButton({
  action,
  variant = "default",
}: {
  action: Action;
  variant?: "default" | "brand" | "danger";
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const needsConfirm = action === "pause" || action === "cancel";

  function onClick() {
    if (needsConfirm && !confirming) {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/membership/${action}`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Something went wrong");
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  const label = isPending
    ? LABELS[action].pending
    : confirming
      ? LABELS[action].confirm || LABELS[action].default
      : LABELS[action].default;

  const baseClasses = "px-4 py-2 rounded-pill text-sm font-medium transition-colors";
  const styles =
    variant === "brand"
      ? "bg-brand text-white hover:bg-brand-hover"
      : variant === "danger"
        ? "border border-error text-error hover:bg-error hover:text-white"
        : "border border-border text-text-secondary hover:text-text-primary";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className={`${baseClasses} ${styles} disabled:opacity-50`}
      >
        {label}
      </button>
      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
