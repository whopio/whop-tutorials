"use client";

import { useActionState, useEffect, useState } from "react";
import { User, Check, X } from "lucide-react";
import { createChannel, type CreateChannelState } from "./actions";

type CheckStatus = "idle" | "checking" | "available" | "taken" | "invalid";

/** Three dots bouncing up and down while the handle check is in flight. */
function LoadingDots() {
  return (
    <span
      className="flex items-center gap-1"
      role="status"
      aria-label="Checking availability"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-fg-muted"
          style={{
            animation: "dot-bounce 1.2s ease-in-out infinite",
            animationDelay: `${(i - 2) * 0.16}s`,
          }}
        />
      ))}
    </span>
  );
}

export function CreateChannelForm({
  defaultName,
  defaultHandle,
  avatarUrl,
}: {
  defaultName: string;
  defaultHandle: string;
  avatarUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState<
    CreateChannelState,
    FormData
  >(createChannel, {});
  const [handle, setHandle] = useState(defaultHandle);
  const [check, setCheck] = useState<{ status: CheckStatus; message?: string }>({
    status: "idle",
  });

  // CHANNEL-2: debounced live availability check. Each keystroke cancels the
  // prior timer + in-flight request, so only the latest result is ever applied.
  useEffect(() => {
    const h = handle.trim();
    if (h.length === 0) {
      setCheck({ status: "idle" });
      return;
    }
    if (h.length < 3) {
      setCheck({
        status: "invalid",
        message: "Handle must be at least 3 characters.",
      });
      return;
    }

    setCheck({ status: "checking" });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/handle-check?handle=${encodeURIComponent(h)}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setCheck({ status: "idle" });
          return;
        }
        const data = (await res.json()) as {
          available: boolean;
          reason?: string;
          message?: string;
        };
        if (data.available) {
          setCheck({ status: "available" });
        } else if (data.reason === "invalid") {
          setCheck({ status: "invalid", message: data.message ?? "Invalid handle." });
        } else {
          setCheck({ status: "taken", message: "That handle is already taken." });
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") setCheck({ status: "idle" });
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [handle]);

  const isError = check.status === "taken" || check.status === "invalid";
  const canSubmit = check.status === "available" && !pending;

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-center text-2xl font-bold">How you'll appear</h1>

      <form action={formAction} className="mt-8 flex flex-col items-center gap-6">
        <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-hover">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-12 w-12 text-fg-muted" />
          )}
        </div>

        <label className="w-full">
          <span className="mb-1 block text-xs text-fg-muted">Name</span>
          <input
            name="name"
            defaultValue={defaultName}
            required
            maxLength={50}
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 outline-none focus:border-accent"
          />
        </label>

        <label className="w-full">
          <span className="mb-1 block text-xs text-fg-muted">Handle</span>
          <div
            className={`flex items-center rounded-lg border ${
              isError
                ? "border-red-500"
                : check.status === "available"
                  ? "border-green-500"
                  : "border-border focus-within:border-accent"
            }`}
          >
            <span className="pl-3 text-fg-muted">@</span>
            <input
              name="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              required
              maxLength={30}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={isError}
              className="min-w-0 flex-1 bg-transparent px-1 py-2.5 outline-none"
            />
            <span className="grid w-9 place-items-center">
              {check.status === "checking" ? <LoadingDots /> : null}
              {check.status === "available" ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : null}
              {isError ? <X className="h-5 w-5 text-red-500" /> : null}
            </span>
          </div>
          {isError && check.message ? (
            <span className="mt-1 block text-xs text-red-500">{check.message}</span>
          ) : check.status === "available" ? (
            <span className="mt-1 block text-xs text-green-500">
              Handle is available.
            </span>
          ) : (
            <span className="mt-1 block text-xs text-fg-muted">
              Letters, numbers, and . _ - - at least 3 characters.
            </span>
          )}
        </label>

        {state.error ? (
          <p className="w-full text-sm text-red-500">{state.error}</p>
        ) : null}

        <p className="text-center text-xs text-fg-muted">
          By creating a channel, you agree to Wavora's Terms. Your name and
          handle can be changed later.
        </p>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-full bg-accent py-2.5 font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create channel"}
        </button>
      </form>
    </div>
  );
}
