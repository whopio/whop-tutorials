"use client";

import { useActionState } from "react";
import { createCheckout } from "@/app/actions/checkout";

export function UnlockButton({
  creatorId,
  priceInCents,
}: {
  creatorId: string;
  priceInCents: number;
}) {
  const action = createCheckout.bind(null, creatorId);
  const [state, formAction, pending] = useActionState(action, { error: "" });

  const dollars = (priceInCents / 100).toFixed(2);

  return (
    <div>
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl py-3 px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {pending
            ? "Redirecting to checkout..."
            : `Unlock premium for $${dollars}`}
        </button>
      </form>
      {state?.error && (
        <p className="text-sm text-red-600 mt-2 text-center">{state.error}</p>
      )}
    </div>
  );
}
