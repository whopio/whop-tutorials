import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import BrandIcon from "@/components/BrandIcon";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Features",
  description: "Everything you need to earn and grow on Cuppa.",
};

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-ink">
      <svg
        viewBox="0 0 20 20"
        className="h-5 w-5 shrink-0 text-positive"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 10.5l4 4 8-9" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

function PageMock() {
  return (
    <div className="w-full max-w-[260px] overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="h-16 bg-brand" />
      <div className="px-4 pb-4">
        <div className="-mt-6 flex items-end gap-2">
          <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border-4 border-surface bg-surface-2">
            <BrandIcon name="coffee" className="h-7 w-7" />
          </div>
          <span className="btn-pill btn-accent ml-auto px-4 py-1.5 text-xs">Tip</span>
        </div>
        <div className="mt-2 h-3 w-24 rounded bg-surface-2" />
        <div className="mt-1.5 h-2 w-32 rounded bg-surface-2" />
      </div>
    </div>
  );
}

function CustomizeMock() {
  const colors = ["#467ceb", "#e8634f", "#07b25d", "#9b6cf0", "#202020"];
  return (
    <div className="flex flex-col items-center gap-4">
      <BrandIcon name="palette" className="h-24 w-24" />
      <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 shadow-sm">
        {colors.map((c) => (
          <span key={c} className="h-6 w-6 rounded-full ring-2 ring-surface" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

function ControlMock() {
  return (
    <div className="flex w-full max-w-[240px] flex-col gap-3">
      <span className="self-start rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface">Direct messages</span>
      <span className="self-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">Manage delivery</span>
      <span className="self-end rounded-full bg-[#9b6cf0] px-4 py-2 text-sm font-semibold text-white">Withdraw earnings</span>
    </div>
  );
}

function FeatureBlock({
  heading,
  reverse,
  tint,
  graphic,
  children,
}: {
  heading: string;
  reverse?: boolean;
  tint: string;
  graphic: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid items-stretch gap-4 md:grid-cols-2">
      <div
        className={`flex flex-col justify-center rounded-3xl border border-line bg-surface p-8 sm:p-10 ${
          reverse ? "md:order-2" : ""
        }`}
      >
        <h2 className="text-3xl sm:text-4xl">{heading}</h2>
        <div className="mt-4 space-y-3 text-muted">{children}</div>
      </div>
      <div className={`grid min-h-[260px] place-items-center rounded-3xl p-8 ${tint} ${reverse ? "md:order-1" : ""}`}>
        {graphic}
      </div>
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 backdrop-blur-lg">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <BrandIcon name="coffee" className="h-9 w-9" />
            <span className="font-display text-2xl font-extrabold">Cuppa</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/explore" className="hidden text-sm font-semibold sm:block">
              Explore
            </Link>
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

      <section className="mx-auto max-w-5xl px-5 pb-8 pt-14 text-center sm:pt-20">
        <h1 className="text-balance text-5xl sm:text-6xl">Payday your way</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Cuppa gives you the tools to earn money directly from the people who love your work. Here is
          everything you get.
        </p>
        <div className="mt-7 flex justify-center">
          <a href="/api/auth/login?returnTo=/dashboard/start" className="btn-pill btn-soft px-7 py-3 text-base">
            Get started
          </a>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-4 px-5 py-8">
        <FeatureBlock heading="Create your free page" tint="bg-soft-blue" graphic={<PageMock />}>
          <p>
            Take the first step to give your fans a way to support your creative work. Setting up your
            Cuppa page takes a couple of minutes.
          </p>
        </FeatureBlock>

        <FeatureBlock
          heading="Get paid directly"
          reverse
          tint="bg-[#d6f0dd] dark:bg-[#26352b]"
          graphic={<BrandIcon name="money" className="h-32 w-32" />}
        >
          <p>
            Payments land in <strong className="text-ink">your own connected account</strong>, powered by
            Whop. Cuppa never holds your money or pays you out on a schedule.
          </p>
          <p>Withdraw your balance right here on Cuppa whenever you like.</p>
        </FeatureBlock>

        <FeatureBlock heading="Make it your own" tint="bg-[#e7defb] dark:bg-[#2f2a3e]" graphic={<CustomizeMock />}>
          <p>
            Choose your own cover image, avatar, and accent color. Switch between light and dark. Your
            page, your vibe.
          </p>
        </FeatureBlock>

        <FeatureBlock
          heading="Share with your audience"
          reverse
          tint="bg-[#f8dbd5] dark:bg-[#3a2a2e]"
          graphic={<BrandIcon name="megaphone" className="h-32 w-32" />}
        >
          <p>
            Cuppa gives you the tools, but you bring the supporters. There is no algorithm deciding who
            sees your page. You control how and where you promote it.
          </p>
        </FeatureBlock>

        <FeatureBlock heading="Everything you need" tint="bg-[#fbecb0] dark:bg-[#3a3526]" graphic={<ControlMock />}>
          <p>Cuppa gives you full control:</p>
          <ul className="space-y-2">
            <Check>Set your own pricing and terms</Check>
            <Check>Tips, memberships, a shop, and posts</Check>
            <Check>Message supporters and manage delivery</Check>
            <Check>Withdraw your earnings on-site</Check>
          </ul>
        </FeatureBlock>
      </div>

      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="relative overflow-hidden rounded-[32px] bg-soft-blue px-6 py-16 text-center">
          <h2 className="text-4xl sm:text-5xl">Get started</h2>
          <p className="mx-auto mt-3 max-w-md text-ink/80">
            Set up your page in minutes. It is free, and you only pay a small fee when you earn.
          </p>
          <div className="mt-7 flex justify-center">
            <a
              href="/api/auth/login?returnTo=/dashboard/start"
              className="btn-pill btn-primary px-8 py-3.5 text-base"
            >
              Sign up free
            </a>
          </div>
          <BrandIcon name="coffee" className="absolute -left-3 bottom-1 hidden h-24 w-24 -rotate-12 sm:block" />
          <BrandIcon name="palette" className="absolute -right-3 top-3 hidden h-24 w-24 rotate-12 sm:block" />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
