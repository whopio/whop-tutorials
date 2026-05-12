"use client";

import { useActionState } from "react";
import { createCheckout } from "@/app/actions/checkout";

interface UnlockButtonProps {
  songId: string;
  artistId: string;
  price: number;
}

const initialState = { message: "" };

export function UnlockButton({ songId, artistId, price }: UnlockButtonProps) {
  const [state, action, pending] = useActionState(createCheckout, initialState);

  return (
    <div className="mt-3">
      <form action={action}>
        <input type="hidden" name="songId" value={songId} />
        <input type="hidden" name="artistId" value={artistId} />
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex items-center gap-2.5 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #9f67fa 100%)",
            boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
          }}
        >
          {pending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Redirecting to checkout…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Unlock for ${(price / 100).toFixed(2)}
            </>
          )}
        </button>
      </form>
      {state?.message && (
        <p className="text-xs text-red-500 mt-2">{state.message}</p>
      )}
    </div>
  );
}
