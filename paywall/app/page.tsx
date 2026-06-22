import Link from "next/link";
import { Badge, Heading, Separator, Text } from "@whop/react/components";
import { PaywallCard, type TierOption } from "@/components/PaywallCard";
import { ProBadgeCta } from "@/components/ProBadgeCta";
import { ResetDemoButton } from "@/components/ResetDemoButton";
import { StepAnchor } from "@/components/StepAnchor";
import { StepRail } from "@/components/StepRail";
import { UnlockedBanner } from "@/components/UnlockedBanner";
import {
  lockedSteps,
  unlockedSteps,
  type PaywallMode,
} from "@/components/steps";
import { getPost } from "@/constants/posts";
import { getEnv } from "@/lib/env";
import { checkProductAccess, hasAccess } from "@/lib/paywall";
import { getSession } from "@/lib/session";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode: rawMode } = await searchParams;
  const mode: PaywallMode =
    rawMode === "one-time" ? "one-time" : "subscription";
  const slug =
    mode === "one-time" ? "saas-pricing-teardown" : "the-churn-report";
  const post = getPost(slug);
  if (!post) throw new Error("demo post missing");

  const env = getEnv();
  const session = await getSession();
  const unlocked = await hasAccess([env.WHOP_PRO_PRODUCT_ID, post.productId]);

  const proGranted = session.whopUserId
    ? await checkProductAccess(env.WHOP_PRO_PRODUCT_ID, session.whopUserId)
    : false;
  const postGranted =
    session.whopUserId && post.productId
      ? await checkProductAccess(post.productId, session.whopUserId)
      : false;

  const checkedAt = new Date().toISOString().slice(11, 19) + " UTC";
  const steps = unlocked ? unlockedSteps(mode) : lockedSteps(mode);

  const proOption: TierOption = {
    key: "pro",
    label: "Pulse Pro",
    description: "$10 a month. Every premium post on Pulse.",
    planId: env.WHOP_PRO_PLAN_ID,
  };
  const options: TierOption[] =
    mode === "one-time" && post.planId
      ? [
          {
            key: "post",
            label: "Unlock this post",
            description: "$5 one time. Yours forever.",
            planId: post.planId,
          },
        ]
      : [proOption];

  return (
    <main className="min-h-screen bg-[#F1F1F1]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start">
        {/* Control rail */}
        <aside className="order-2 shrink-0 lg:order-1 lg:sticky lg:top-8 lg:w-[360px]">
          <Heading size="6" style={{ fontFamily: "var(--font-acid)" }}>
            How paywalls work with Whop
          </Heading>
          <div className="mt-2">
            <Text size="2" color="gray" as="p">
              On the right is Pulse, a small SaaS with paid posts. The
              walkthrough below follows the paywall from locked to unlocked.
              Everything is live: the checkout is real, on Whop&apos;s
              sandbox.
            </Text>
          </div>

          {/* Keyed on lock state only: switching tabs keeps the current
              step, while unlocking swaps to the unlocked sequence. */}
          <div className="mt-5">
            <StepRail key={unlocked ? "u" : "l"} steps={steps} />
          </div>

          <Separator size="4" className="my-5" />

          <div className="flex flex-wrap items-center gap-3">
            {session.whopUserId ? (
              <>
                <Badge color="green" variant="soft">
                  @{session.username ?? "member"}
                </Badge>
                <StepAnchor id="reset">
                  <ResetDemoButton />
                </StepAnchor>
              </>
            ) : (
              <StepAnchor id="restore">
                <Text size="2" color="gray">
                  <a href="/api/auth/login" className="hover:underline">
                    Already unlocked? Sign in with Whop
                  </a>
                </Text>
              </StepAnchor>
            )}
          </div>

          <div className="mt-5">
            <Text size="1" color="gray" as="p">
              Companion demo for the article &quot;How to add a paywall to a
              Next.js SaaS app&quot;.
            </Text>
          </div>
        </aside>

        {/* Preview */}
        <section className="order-1 min-w-0 flex-1 lg:order-2">
          <StepAnchor id="tabs" block>
            <div className="flex gap-1 rounded-t-xl border border-b-0 border-[#E5E4E0] bg-white/70 p-1.5">
              {(
                [
                  ["subscription", "Subscription"],
                  ["one-time", "One-time purchase"],
                ] as const
              ).map(([key, label]) => (
                <Link
                  key={key}
                  href={key === "subscription" ? "/" : "/?mode=one-time"}
                  scroll={false}
                  className={[
                    "flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium transition",
                    mode === key
                      ? "bg-[#151515] text-white"
                      : "text-[#151515]/70 hover:bg-[#151515]/5",
                  ].join(" ")}
                >
                  {label}
                </Link>
              ))}
            </div>
          </StepAnchor>

          <div className="overflow-hidden rounded-b-xl border border-[#E5E4E0] bg-white shadow-sm">
            {/* Browser chrome */}
            <div className="flex items-center gap-3 border-b border-[#E5E4E0] bg-[#FAFAF9] px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E4E0]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E4E0]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E4E0]" />
              </div>
              <div className="flex-1 rounded-md bg-white px-3 py-1 text-center">
                <Text size="1" color="gray">
                  pulse.demo/posts/{post.slug}
                </Text>
              </div>
            </div>

            {/* The gated page */}
            <div className="px-5 py-6 sm:px-8">
              <div className="flex items-center justify-between">
                <Heading size="4" style={{ fontFamily: "var(--font-acid)" }}>
                  Pulse
                </Heading>
                {unlocked ? (
                  <Badge color="green" variant="soft">
                    Unlocked
                  </Badge>
                ) : (
                  <ProBadgeCta />
                )}
              </div>

              <div className="mt-5">
                <Heading size="6">{post.title}</Heading>
                <div className="mt-1">
                  <Text size="2" color="gray">
                    {post.minutes} min read
                  </Text>
                </div>
              </div>

              <Separator size="4" className="my-5" />

              {unlocked ? (
                <div className="flex flex-col gap-5">
                  <UnlockedBanner
                    username={session.username}
                    checkedAt={checkedAt}
                    entitlements={[
                      { label: "Subscription", granted: proGranted },
                      ...(post.productId
                        ? [{ label: "This post", granted: postGranted }]
                        : []),
                    ]}
                  />
                  <StepAnchor id="pro-content" block>
                    <article className="flex flex-col gap-4">
                      {post.body.map((paragraph, i) => (
                        <Text key={i} size="3" as="p">
                          {paragraph}
                        </Text>
                      ))}
                    </article>
                  </StepAnchor>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <StepAnchor id="free-teaser" block>
                    <Text size="3" as="p">
                      {post.teaser}
                    </Text>
                  </StepAnchor>

                  <StepAnchor id="gate" block>
                    <PaywallCard
                      options={options}
                      proOption={proOption}
                      environment={env.WHOP_SANDBOX ? "sandbox" : "production"}
                      returnUrl={`${env.APP_URL}/${mode === "one-time" ? "?mode=one-time" : ""}`}
                    />
                  </StepAnchor>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
