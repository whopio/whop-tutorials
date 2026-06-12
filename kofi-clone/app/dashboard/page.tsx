import Link from "next/link";
import { requireCreator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUsd } from "@/lib/fees";
import BrandIcon from "@/components/BrandIcon";
import ShareCard from "@/components/dashboard/ShareCard";
import { Check, Gear, ArrowUpRight } from "@/components/Icons";

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function DashboardHomePage() {
  const user = await requireCreator();
  const creator = user.creator;

  const [totals, followingCount, followerCount, tierCount, productCount, goalCount, recentSupports, recentOrders] =
    await Promise.all([
      prisma.support.aggregate({
        where: { creatorId: creator.id, status: "COMPLETED" },
        _sum: { coffees: true, amountCents: true },
        _count: true,
      }),
      prisma.follow.count({ where: { userId: creator.userId } }),
      prisma.follow.count({ where: { creatorId: creator.id } }),
      prisma.tier.count({ where: { creatorId: creator.id, isActive: true } }),
      prisma.product.count({ where: { creatorId: creator.id, isActive: true } }),
      prisma.goal.count({ where: { creatorId: creator.id, isActive: true } }),
      prisma.support.findMany({
        where: { creatorId: creator.id, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.order.findMany({
        where: { creatorId: creator.id, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { product: true },
      }),
    ]);

  const coffees = totals._sum.coffees ?? 0;
  const raised = totals._sum.amountCents ?? 0;
  const supporterCount = totals._count;

  const activity = [
    ...recentSupports.map((s) => ({
      id: s.id,
      name: s.supporterName,
      label: `${s.coffees} ${s.coffees === 1 ? "coffee" : "coffees"}`,
      amountCents: s.amountCents,
      at: s.createdAt,
    })),
    ...recentOrders.map((o) => ({
      id: o.id,
      name: o.buyerName,
      label: o.product.title,
      amountCents: o.amountCents,
      at: o.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  const steps = [
    {
      key: "connect",
      title: "Set up payouts",
      desc: "Link an account so your earnings have somewhere to land.",
      done: !!creator.whopCompanyId,
      href: "/dashboard/payouts",
      action: "Set up",
    },
    {
      key: "profile",
      title: "Make the page yours",
      desc: "Add a photo and a line about what you do.",
      done: !!creator.bio && !!(creator.avatarUrl || creator.coverImageUrl),
      href: "/dashboard/settings",
      action: "Edit",
    },
    {
      key: "earn",
      title: "Give people a way to chip in",
      desc: "Add a membership, list something in your shop, or set a goal.",
      done: tierCount + productCount + goalCount > 0,
      href: "/dashboard/tiers",
      action: "Add",
    },
    {
      key: "share",
      title: "Put it out there",
      desc: "Share your link and land your first cup.",
      done: supporterCount > 0,
      href: `/${creator.username}`,
      action: "Share",
    },
  ];
  const progress = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);

  const avatarUrl = creator.avatarUrl ?? user.avatarUrl;

  const suggestions = [
    {
      icon: "palette" as const,
      title: "Add a cover image",
      desc: "A banner up top makes the page feel like yours.",
      href: "/dashboard/settings",
      action: "Add a cover",
    },
    {
      icon: "money" as const,
      title: "Set a goal",
      desc: "Show people what their support is building toward.",
      href: "/dashboard/settings",
      action: "Set a goal",
    },
    {
      icon: "megaphone" as const,
      title: "Post an update",
      desc: "Share what you're working on so people have a reason to come back.",
      href: "/dashboard/posts",
      action: "Write a post",
    },
    {
      icon: "heart" as const,
      title: "Add a membership",
      desc: "Let your regulars back you every month for perks.",
      href: "/dashboard/tiers",
      action: "Add a membership",
    },
    {
      icon: "shop" as const,
      title: "Stock your shop",
      desc: "Sell downloads or physical goods, no listing fees.",
      href: "/dashboard/shop",
      action: "Add a product",
    },
    {
      icon: "confetti" as const,
      title: "Spread the word",
      desc: "Send your page to a few people and see who chips in.",
      href: `/${creator.username}`,
      action: "Share your page",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Home</h1>

      {/* Onboarding checklist */}
      <section className="kofi-card p-6">
        <h2 className="text-lg font-bold">Get your page ready</h2>
        <p className="text-sm text-muted">A few quick things before you share it.</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-positive transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-5 space-y-3">
          {steps.map((step) => (
            <div key={step.key} className="flex items-center gap-3 rounded-2xl border border-line p-4">
              <span
                className={
                  step.done
                    ? "grid h-6 w-6 shrink-0 place-items-center rounded-full bg-positive text-white"
                    : "h-6 w-6 shrink-0 rounded-full border-2 border-muted/40"
                }
              >
                {step.done ? <Check className="h-4 w-4" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{step.title}</p>
                <p className="text-sm text-muted">{step.desc}</p>
              </div>
              {step.done ? (
                <span className="shrink-0 text-sm font-semibold text-muted">Done</span>
              ) : (
                <Link href={step.href} className="btn-pill btn-secondary shrink-0 text-sm">
                  {step.action}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Profile + stats */}
      <section className="kofi-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-lg font-bold">
                {creator.displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-lg font-bold">{creator.displayName}</p>
              <p className="text-sm text-muted">cuppa.com/{creator.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/settings" className="btn-pill btn-secondary text-sm">
              Edit profile
            </Link>
            <Link
              href="/dashboard/settings"
              aria-label="Settings"
              className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition hover:bg-surface-2 hover:text-ink"
            >
              <Gear className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4">
          <div>
            <p className="text-lg font-bold">{coffees.toLocaleString()}</p>
            <p className="text-xs text-muted">Coffees</p>
          </div>
          <div>
            <p className="text-lg font-bold">{followingCount.toLocaleString()}</p>
            <p className="text-xs text-muted">Following</p>
          </div>
          <div>
            <p className="text-lg font-bold">{followerCount.toLocaleString()}</p>
            <p className="text-xs text-muted">Followers</p>
          </div>
        </div>
      </section>

      {/* Recent payments & orders */}
      <section className="kofi-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Latest support</h2>
          <Link href="/dashboard/supporters" className="text-sm font-semibold text-muted hover:text-ink">
            View all <ArrowUpRight className="inline h-4 w-4 align-text-bottom" />
          </Link>
        </div>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing&rsquo;s come in yet. Share your link and that&rsquo;ll change.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.name}</p>
                  <p className="text-xs text-muted">
                    {a.label} · {timeAgo(a.at)}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-positive">{formatUsd(a.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Share + numbers */}
      <div className="grid gap-6 md:grid-cols-2">
        <ShareCard username={creator.username} />
        <section className="kofi-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">At a glance</h2>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{formatUsd(raised)}</p>
              <p className="text-xs text-muted">Raised</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{supporterCount.toLocaleString()}</p>
              <p className="text-xs text-muted">Supporters</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{coffees.toLocaleString()}</p>
              <p className="text-xs text-muted">Coffees</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{followerCount.toLocaleString()}</p>
              <p className="text-xs text-muted">Followers</p>
            </div>
          </div>
        </section>
      </div>

      {/* Suggestions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Things to try</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {suggestions.map((s) => (
            <div key={s.title} className="kofi-card flex flex-col p-5">
              <div className="flex items-center gap-2">
                <BrandIcon name={s.icon} className="h-7 w-7" />
                <h3 className="font-bold">{s.title}</h3>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted">{s.desc}</p>
              <Link href={s.href} className="btn-pill btn-outline mt-4 self-start text-sm">
                {s.action}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
