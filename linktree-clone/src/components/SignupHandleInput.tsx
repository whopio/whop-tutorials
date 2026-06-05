"use client";

import { useState } from "react";

// Hero CTA. The input shows a live preview of what the creator's URL would
// look like, then submits to the OAuth login route. The handle is passed as
// a query param so we can pre-fill it on the dashboard after the user comes
// back from Whop (read by the dashboard via cookie).

const HANDLE_PATTERN = /^[a-z0-9_-]{0,32}$/;

function sanitize(input: string) {
  // Match the same charset the profile schema accepts.
  return input
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
}

export function SignupHandleInput({
  urlHost,
  compact = false,
}: {
  urlHost: string;
  // When true, the inline prefix shows just `/u/` instead of the full host.
  // Useful in the secondary CTA where the visitor has already seen the host
  // higher up the page and a shorter prefix reads cleaner.
  compact?: boolean;
}) {
  const [handle, setHandle] = useState("");

  const cleaned = sanitize(handle);
  const showError = handle.length > 0 && !HANDLE_PATTERN.test(handle);
  const inlinePrefix = compact ? "/u/" : `${urlHost}/u/`;

  // Native form submission used to fight the React-controlled input value:
  // the cleaned string would land in the DOM but React would re-render to
  // the raw string before the browser collected the form data. Navigating
  // programmatically avoids the race entirely and lets us use the cleaned
  // value verbatim.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = cleaned
      ? `/api/auth/login?handle=${encodeURIComponent(cleaned)}`
      : `/api/auth/login`;
    window.location.assign(target);
  }

  return (
    <form
      action="/api/auth/login"
      method="GET"
      className="w-full max-w-md"
      onSubmit={handleSubmit}
    >
      <label htmlFor="hero-handle" className="sr-only">
        Pick your handle
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="flex flex-1 items-stretch overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(15,15,18,0.04)] focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/10 transition-colors">
          <span className="hidden items-center border-r border-neutral-200 bg-neutral-50 px-3 font-mono text-xs text-neutral-500 sm:inline-flex">
            {inlinePrefix}
          </span>
          <input
            id="hero-handle"
            name="handle"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="yourname"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="flex-1 bg-white px-4 py-3 font-mono text-sm text-neutral-900 outline-none placeholder:text-neutral-300"
            aria-describedby="hero-handle-help"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/30"
        >
          Get my link
        </button>
      </div>
      <p
        id="hero-handle-help"
        className="mt-2 text-center text-xs text-neutral-500 sm:text-left"
      >
        {showError ? (
          <span className="text-red-600">
            Handle can only contain lowercase letters, numbers, underscores,
            and dashes.
          </span>
        ) : cleaned ? (
          <>
            Your URL: <span className="font-mono text-neutral-700">{urlHost}/u/{cleaned}</span>
          </>
        ) : (
          <>Free to start. Sign in with Whop on the next screen.</>
        )}
      </p>
    </form>
  );
}
