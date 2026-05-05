import { getCurrentUserId } from "@/lib/session";
import { redirect } from "next/navigation";
import { HeroFloatingCards } from "@/components/HeroFloatingCards";
import { SignupHandleInput } from "@/components/SignupHandleInput";

export default async function Home() {
  const userId = await getCurrentUserId();
  if (userId) redirect("/dashboard");

  // Use the configured public URL (without protocol) as the URL preview
  // shown in the handle input. Falls back to the production demo URL when
  // the env var is missing.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://linktree-clone-theta-azure.vercel.app";
  const urlHost = appUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="relative z-20 flex items-center justify-between border-b border-[var(--border-muted)] bg-[var(--background)]/80 px-6 py-4 backdrop-blur">
        <span className="text-sm font-semibold tracking-tight">Linkstacks</span>
        <a
          href="/api/auth/login"
          className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Sign in
        </a>
      </header>

      <main className="relative flex-1">
        {/* Hero with floating example cards behind. */}
        <section className="relative isolate overflow-hidden">
          <HeroFloatingCards />

          {/* Soft top-down wash so the hero text reads cleanly on top of the
              floating mockups. */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-[var(--background)]/60 via-[var(--background)]/85 to-[var(--background)] pointer-events-none"
            aria-hidden
          />

          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center sm:py-32">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
              One link
              <br />
              Everything you make
            </h1>

            <p className="mt-6 max-w-md text-base leading-relaxed text-neutral-600 sm:text-lg">
              Share your links and charge for premium content from a single
              page.
            </p>

            <div className="mt-10 w-full">
              <div className="flex justify-center">
                <SignupHandleInput urlHost={urlHost} compact />
              </div>
            </div>
          </div>
        </section>

        {/* How it works. Three short steps so the page has body content
            below the hero and the visitor knows what to expect. */}
        <section className="relative z-10 border-t border-[var(--border-muted)] bg-[var(--background-alt)]">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-neutral-500">
              How it works
            </p>
            <h2 className="mt-3 text-center text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              Three steps from signup to first sale
            </h2>

            <div className="mt-12 grid gap-10 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.title}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-xs font-semibold text-neutral-700">
                      {step.n}
                    </span>
                    <h3 className="text-base font-semibold tracking-tight text-neutral-900">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mid-page CTA so the visitor can act without scrolling back up. */}
        <section className="relative z-10 border-t border-[var(--border-muted)]">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              Claim your link
            </h2>
            <p className="mt-3 text-sm text-neutral-500 sm:text-base">
              Five minutes from sign-in to a live page that takes payments.
            </p>
            <div className="mt-8 flex justify-center">
              <SignupHandleInput urlHost={urlHost} compact />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-muted)] px-6 py-5 text-center text-xs text-neutral-400">
        Built on Whop
      </footer>
    </div>
  );
}

const STEPS = [
  {
    n: 1,
    title: "Sign in with Whop",
    body: "One click using OAuth. Whop handles your account, identity, and billing rails so you don't have to.",
  },
  {
    n: 2,
    title: "Customize your page",
    body: "Pick a handle and an accent color, add your links, mark a few as premium, drag to reorder. The live preview tracks every edit.",
  },
  {
    n: 3,
    title: "Get paid",
    body: "Premium links unlock through a hosted checkout. The platform takes a small fee; the rest lands in your connected payout account.",
  },
] as const;
