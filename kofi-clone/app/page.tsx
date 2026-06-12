import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { accentHex } from "@/lib/accent";
import ThemeToggle from "@/components/ThemeToggle";
import BrandIcon, { type BrandIconName } from "@/components/BrandIcon";
import CreatorCategories, { type FeaturedCreator } from "@/components/CreatorCategories";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@whop/react/components";

const AUTH_ERRORS: Record<string, string> = {
  token_exchange_failed: "We couldn't complete sign in with Whop. Please try again.",
  state_mismatch: "Your sign in session expired. Please try again.",
  missing_pkce: "Your sign in session expired. Please try again.",
  bad_pkce: "Your sign in session expired. Please try again.",
  missing_code: "Sign in was canceled.",
  access_denied: "Sign in was canceled.",
};

async function getFeaturedCreators(): Promise<FeaturedCreator[]> {
  const creators = await prisma.creator.findMany({
    where: { isActive: true, whopOnboarded: true },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      accentColor: true,
      tags: true,
    },
  });
  if (creators.length === 0) return [];

  const counts = await prisma.support.groupBy({
    by: ["creatorId"],
    where: { creatorId: { in: creators.map((c) => c.id) }, status: "COMPLETED" },
    _count: { _all: true },
  });
  const countByCreator = new Map(counts.map((c) => [c.creatorId, c._count._all]));

  return creators.map((c) => ({
    username: c.username,
    displayName: c.displayName,
    avatarUrl: c.avatarUrl,
    accent: accentHex(c.accentColor),
    supporters: countByCreator.get(c.id) ?? 0,
    tags: c.tags,
  }));
}

const STEPS: { icon: BrandIconName; title: string; body: string }[] = [
  { icon: "palette", title: "Create your page", body: "Sign up in seconds and set up a page that looks just how you want." },
  { icon: "megaphone", title: "Share it with fans", body: "Drop your link anywhere — your bio, your stream, your newsletter." },
  { icon: "money", title: "Get paid directly & instantly", body: "Tips, memberships, and sales land in your account right away." },
];

const FAQS = [
  {
    q: "What is Cuppa?",
    a: "Cuppa is the easiest way to support creators. Fans send one-time tips, join monthly memberships, and buy from your shop, all from one simple page.",
  },
  {
    q: "How does Cuppa work?",
    a: "Create your page, share your link, and start earning. You decide what to offer: accept tips, set up membership tiers, sell digital or physical products, and publish posts for your supporters.",
  },
  {
    q: "Does Cuppa take a fee?",
    a: "No monthly fees. We take a small platform fee of up to 5% on what you earn, and nothing when you are not earning.",
  },
  {
    q: "Can I use Cuppa if I'm just starting out?",
    a: "Absolutely. Cuppa is free to set up and works whether you have five fans or fifty thousand. There is nothing to lose by starting today.",
  },
  {
    q: "How do I get paid on Cuppa?",
    a: "You get paid directly. Payments land in your own connected account powered by Whop, and you withdraw your earnings right here on Cuppa whenever you like.",
  },
  {
    q: "How is Cuppa different from other services?",
    a: "Cuppa is built for simplicity: one page for tips, memberships, and a shop, with payments going directly to you. No complicated setup, no waiting to get paid.",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const sp = await searchParams;
  const authError = sp.authError
    ? AUTH_ERRORS[sp.authError] ?? "Sign in didn't complete. Please try again."
    : null;

  const creators = await getFeaturedCreators();

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 backdrop-blur-lg">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <BrandIcon name="coffee" className="h-9 w-9" />
          <span className="font-display text-2xl font-extrabold">Cuppa</span>
        </Link>
        <div className="flex items-center gap-3">
          <a href="#how-it-works" className="hidden text-sm font-semibold sm:block">
            How it works
          </a>
          <ThemeToggle />
          <a href="/api/auth/login" className="text-sm font-semibold">
            Log in
          </a>
          <a href="/api/auth/login?returnTo=/dashboard/start" className="btn-pill btn-primary text-sm">
            Sign up free
          </a>
        </div>
        </nav>
      </header>

      {authError ? (
        <div className="mx-auto max-w-6xl px-5">
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40">
            {authError}
          </p>
        </div>
      ) : null}

      <section className="mx-auto max-w-3xl px-5 pb-10 pt-16 text-center sm:pt-24">
        <h1 className="text-balance text-5xl leading-[1.05] sm:text-6xl">
          Let the people who love your work chip in
        </h1>
        <p className="mx-auto mt-6 max-w-md text-lg text-muted">
          Set up a page in minutes and start taking tips, memberships, and shop orders from the people who follow you.
        </p>
        <div className="mt-8 flex justify-center">
          <a
            href="/api/auth/login?returnTo=/dashboard/start"
            className="btn-pill btn-soft px-7 py-3 text-base"
          >
            Get started
          </a>
        </div>
        <div className="mt-12 flex justify-center gap-4" aria-hidden="true">
          <BrandIcon name="coffee" className="h-14 w-14" />
          <BrandIcon name="palette" className="h-14 w-14" />
          <BrandIcon name="money" className="h-14 w-14" />
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-5 py-10">
        <div className="kofi-card p-8 text-center sm:p-10">
          <h2 className="text-3xl sm:text-4xl">Payday your way</h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Decide how you want to earn, set your own terms, and get paid directly. All
            from one place, at your own pace.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/features" className="btn-pill btn-primary text-sm">
              Learn how Cuppa works
            </Link>
          </div>
        </div>
      </section>

      {creators.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 py-12">
          <div className="mb-8 text-center">
            <h2 className="text-3xl sm:text-4xl">Creators of all kinds</h2>
            <p className="mt-2 text-muted">
              Artists, writers, musicians, streamers, and podcasters. If people love what you make, Cuppa gives them an easy way to support it.
            </p>
          </div>
          <CreatorCategories creators={creators} />
        </section>
      ) : null}

      <section id="how-it-works" className="mx-auto max-w-5xl scroll-mt-8 px-5 py-16">
        <h2 className="mb-10 text-center text-3xl sm:text-4xl">How it works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-surface-2">
                <BrandIcon name={step.icon} className="h-12 w-12" />
              </div>
              <h3 className="mt-4 text-lg font-bold">
                {i + 1}. {step.title}
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="scroll-mt-8 bg-soft-blue">
        <div className="relative mx-auto max-w-5xl px-5 py-16">
          <BrandIcon name="coffee" className="absolute left-2 top-24 hidden h-20 w-20 -rotate-12 lg:block" />
          <BrandIcon name="money" className="absolute right-2 top-16 hidden h-20 w-20 rotate-12 lg:block" />
          <div className="relative z-10 mx-auto max-w-2xl rounded-[28px] border border-line bg-surface p-6 shadow-sm sm:p-10">
            <h2 className="mb-8 text-3xl sm:text-4xl">Frequently asked questions</h2>
            <div className="space-y-4">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-2xl border-2 border-ink bg-soft-blue px-5 py-4 dark:border-white/25"
                >
                  <summary className="flex items-center justify-between gap-4 font-bold text-ink marker:content-[''] [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <span className="text-2xl leading-none transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink/80">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-soft-blue">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:py-20">
          <h2 className="text-3xl text-ink sm:text-5xl">Grab your Cuppa page</h2>
          <div className="relative mx-auto mt-8 max-w-xl">
            <BrandIcon name="palette" className="absolute -left-24 -top-7 hidden h-24 w-24 -rotate-12 lg:block" />
            <BrandIcon name="money" className="absolute -right-24 -top-3 hidden h-24 w-24 rotate-12 lg:block" />
            <form
              action="/api/auth/login"
              method="get"
              className="flex items-center gap-2 rounded-full bg-surface p-2 pl-5 shadow-sm"
            >
              <span className="shrink-0 font-semibold text-ink">cuppa.com/</span>
              <input
                name="handle"
                placeholder="yourname"
                autoComplete="off"
                aria-label="Choose your Cuppa page URL"
                className="min-w-0 flex-1 bg-transparent py-2 text-ink outline-none placeholder:text-muted"
              />
              <input type="hidden" name="returnTo" value="/dashboard/start" />
              <Button type="submit" size="3" variant="solid" color="gray" highContrast className="shrink-0">
                Claim
              </Button>
            </form>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
