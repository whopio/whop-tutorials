import type { Metadata } from "next";
import { Star, Check } from "lucide-react";
import { getAuthUser } from "@/lib/auth";
import { MembershipCTA } from "@/components/checkout/MembershipCTA";
import { MembershipPromoSection } from "@/components/checkout/MembershipPromoSection";

export const metadata: Metadata = {
  title: "Subscribe",
  description:
    "$5/month unlocks every paid story on Storyline. 70% of your subscription goes directly to the writers you read.",
};

const PRICE = Number(process.env.STORYLINE_PLUS_MONTHLY_PRICE || "5");
const WRITER_PCT = 100 - Number(process.env.PLATFORM_PLUS_FEE_PERCENT || "30");

const BENEFITS = [
  {
    title: "70% goes to writers",
    body: `Your $${PRICE} doesn't disappear into a platform's general fund. Each month we split ${WRITER_PCT}% of subscription revenue across the writers you actually read, weighted by reads. Writers see the payout land in their Whop account on the 1st.`,
  },
  {
    title: "Unlock every paid story",
    body:
      "One subscription, the whole catalog. Writers paywall what they want, and the moment you subscribe everything opens.",
  },
  {
    title: "No ads, no algorithm",
    body:
      "No banners, no tracking pixels, no recommendation engine optimizing for outrage. You follow writers and topics; the feed shows you what they published, when they published it.",
  },
  {
    title: "Cancel from your dashboard",
    body:
      "Pause, cancel, or uncancel in two clicks — billing self-service, no support emails. Your reads still count toward writer payouts through the end of the period you paid for.",
  },
];

const PRICING_PERKS = [
  "Every paid story, unlocked",
  `${WRITER_PCT}% of your subscription paid to writers monthly`,
  "Bookmarks, follows, and tipping included",
  "Cancel any time",
];

export default async function MembershipPage() {
  const user = await getAuthUser();
  const isPlus = Boolean(user?.id);

  return (
    <div className="bg-background-marketing border-b border-border">
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1336px] px-6 sm:px-10 py-16 sm:py-24 text-center">
          <h1 className="font-display font-normal text-[44px] sm:text-[64px] lg:text-[85px] leading-[1.05] tracking-tight text-text-primary mx-auto max-w-3xl">
            ${PRICE} a month. {WRITER_PCT}% goes to writers.
          </h1>
          <p className="mt-5 mx-auto max-w-xl text-text-secondary text-base sm:text-lg">
            Storyline is reader-funded. One subscription unlocks every paid story. Each month we
            split {WRITER_PCT}% of revenue across the writers you actually read.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <MembershipCTA authenticated={isPlus} label={`Subscribe — $${PRICE}/month`} />
            <a
              href="#plans"
              className="inline-flex items-center px-6 py-3 rounded-pill border border-text-primary text-text-primary text-base font-medium hover:bg-text-primary hover:text-background transition-colors"
            >
              See what&apos;s included
            </a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-background">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-10 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
          <h2 className="font-display text-[28px] sm:text-[36px] leading-tight text-text-primary lg:sticky lg:top-[80px] h-fit">
            What you get
          </h2>
          <div className="space-y-12">
            {BENEFITS.map((b) => (
              <div key={b.title}>
                <h3 className="font-sans font-semibold text-[20px] sm:text-[22px] text-text-primary">
                  {b.title}
                </h3>
                <p className="mt-2 text-text-secondary leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="bg-background-marketing border-t border-border">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-10 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
          <h2 className="font-display text-[28px] sm:text-[36px] leading-tight text-text-primary lg:sticky lg:top-[80px] h-fit">
            Pricing
          </h2>
          <div className="bg-background rounded-md p-6 sm:p-8 border border-border max-w-[420px]">
            <div className="flex items-center gap-2">
              <Star aria-hidden="true" className="size-5 fill-plus stroke-plus" />
              <span className="font-sans font-semibold text-text-primary">Storyline Plus</span>
            </div>
            <div className="mt-3">
              <span className="font-sans font-bold text-[32px] text-text-primary">${PRICE}</span>
              <span className="text-text-secondary ml-1">/month</span>
            </div>
            <div className="mt-5">
              <MembershipPromoSection authenticated={isPlus} />
            </div>
            <ul className="mt-6 space-y-2.5 text-sm text-text-secondary">
              {PRICING_PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <Check aria-hidden="true" className="size-4 mt-0.5 text-brand shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
