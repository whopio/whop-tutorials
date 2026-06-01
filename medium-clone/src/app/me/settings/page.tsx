import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Settings as SettingsIcon,
  Sparkles,
  UserCircle2,
  Users,
  Ticket,
  ExternalLink,
} from "lucide-react";
import { requireAuth, isOperator } from "@/lib/auth";
import { EnablePayoutsButton } from "./EnablePayoutsButton";
import { CopyButton } from "@/components/CopyButton";

export const metadata: Metadata = { title: "Settings" };

interface PageProps {
  searchParams: Promise<{ onboard?: string; kyc?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const user = await requireAuth({ include: { writerProfile: true } });
  const { onboard, kyc } = await searchParams;
  const operator = await isOperator(user.id, user.email);

  const initial = (user.name || user.username || "?").slice(0, 1).toUpperCase();
  const kycComplete = Boolean(user.writerProfile?.kycComplete);

  return (
    <div className="mx-auto max-w-[760px] px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      {/* Page header */}
      <header className="space-y-1.5">
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <SettingsIcon aria-hidden="true" className="size-4" />
          <span>Settings</span>
        </div>
        <h1 className="font-sans font-bold text-[32px] sm:text-[40px] text-text-primary leading-tight">
          Your account
        </h1>
        <p className="text-text-secondary text-[15px]">
          Profile, payouts, and operator tools.
        </p>
      </header>

      {/* Profile card */}
      <Card>
        <SectionHeader
          icon={<UserCircle2 aria-hidden="true" className="size-4" />}
          title="Profile"
          subtitle="Edit your public headline and description from your profile page."
        />
        <div className="px-6 pb-6 pt-5 flex items-center gap-5">
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar}
              alt=""
              className="size-20 rounded-full object-cover ring-1 ring-border shrink-0"
            />
          ) : (
            <div
              aria-hidden="true"
              className="size-20 rounded-full bg-gradient-to-br from-brand to-brand-hover text-white shrink-0 flex items-center justify-center font-display text-[32px] ring-1 ring-border"
            >
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-sans font-bold text-[22px] text-text-primary truncate leading-tight">
              {user.name ?? user.username}
            </div>
            <div className="text-sm mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-text-secondary">
              <Link
                href={`/@${user.username}`}
                className="hover:text-text-primary transition-colors"
              >
                @{user.username}
              </Link>
              <span aria-hidden="true" className="text-text-tertiary">·</span>
              <span className="text-text-tertiary truncate">{user.email}</span>
            </div>
            {user.headline && (
              <p className="text-[14px] text-text-primary mt-2 line-clamp-2">
                {user.headline}
              </p>
            )}
          </div>
        </div>
        <CardFooter>
          <Link
            href={`/@${user.username}`}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            View public profile
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </CardFooter>
      </Card>

      {/* Payouts card */}
      <Card>
        <SectionHeader
          icon={<ShieldCheck aria-hidden="true" className="size-4" />}
          title="Payouts"
          subtitle="Required to accept tips or earn from the Partner Program."
          right={
            kycComplete ? (
              <StatusPill tone="success" icon={<CheckCircle2 className="size-3.5" />}>
                Active
              </StatusPill>
            ) : (
              <StatusPill tone="neutral">Not enabled</StatusPill>
            )
          }
        />
        <div className="px-6 pb-6 pt-5">
          {kycComplete ? (
            <div className="space-y-5">
              <p className="text-[14px] text-text-secondary leading-relaxed">
                Tips and Partner Program transfers land on your Whop sub-account.
                You can withdraw any time from the earnings dashboard.
              </p>

              <div className="rounded-md bg-surface px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-text-tertiary">
                    Whop wallet
                  </div>
                  <code className="block font-mono text-[13px] text-text-primary mt-1 truncate">
                    {user.writerProfile?.whopCompanyId}
                  </code>
                </div>
                <CopyButton
                  value={user.writerProfile?.whopCompanyId ?? ""}
                  label="Copy wallet ID"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/me/dashboard"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors"
                >
                  Open earnings dashboard
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <a
                  href={`https://whop.com/dashboard/${user.writerProfile?.whopCompanyId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Manage on Whop
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[14px] text-text-secondary leading-relaxed">
                We&apos;ll open a Whop sub-account in your name. Earnings land there;
                withdraws happen from your Storyline dashboard — you never leave the site.
              </p>
              {onboard === "true" && (
                <Callout tone="warning">
                  Payouts must be enabled before you can paywall a story or accept tips.
                </Callout>
              )}
              {kyc === "refresh" && (
                <Callout tone="warning">
                  Verification didn&apos;t complete. Try again below.
                </Callout>
              )}
              <div className="pt-1">
                <EnablePayoutsButton />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Operator tools — only renders for ops */}
      {operator && (
        <Card>
          <SectionHeader
            icon={<Sparkles aria-hidden="true" className="size-4" />}
            title="Operator tools"
            subtitle="Storyline admin surfaces. Only visible to operators."
            right={<StatusPill tone="brand">Operator</StatusPill>}
          />
          <div className="px-6 pb-6 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <OperatorLink
              href="/admin/operators"
              icon={<Users aria-hidden="true" className="size-4" />}
              title="Operators"
              body="Add and remove admin access by email."
            />
            <OperatorLink
              href="/admin/promo-codes"
              icon={<Ticket aria-hidden="true" className="size-4" />}
              title="Promo codes"
              body="Create discounted Plus subscription codes."
            />
          </div>
        </Card>
      )}

      <p className="text-xs text-text-tertiary text-center pt-2 leading-relaxed">
        Notification preferences and password reset aren&apos;t available yet.
        <br className="hidden sm:block" />
        Whop manages your identity.
      </p>
    </div>
  );
}

/* ───────────────────────── Building blocks ───────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface overflow-hidden">
      {children}
    </section>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="px-6 pt-5 pb-4 border-b border-border flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-text-primary font-sans font-semibold text-[15px]">
          {icon && <span className="text-brand">{icon}</span>}
          <span>{title}</span>
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-text-secondary leading-relaxed">{subtitle}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

function CardFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-3 border-t border-border bg-background/40 flex items-center justify-between gap-3">
      {children}
    </div>
  );
}

function StatusPill({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode;
  tone: "success" | "neutral" | "brand";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "bg-brand/15 text-brand"
      : tone === "brand"
        ? "bg-plus/15 text-plus"
        : "bg-surface text-text-tertiary border border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-[11px] font-semibold uppercase tracking-wider ${toneClass}`}
    >
      {icon}
      {children}
    </span>
  );
}

function Callout({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "warning";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-warning/10 border-warning/40 text-text-primary"
      : "bg-surface border-border text-text-primary";
  return (
    <div
      role="alert"
      className={`flex items-start gap-2 px-3 py-2.5 rounded-md border text-sm ${toneClass}`}
    >
      <AlertCircle
        aria-hidden="true"
        className="size-4 text-warning shrink-0 mt-0.5"
      />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

function OperatorLink({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-md border border-border bg-background hover:border-text-primary hover:bg-surface px-4 py-3.5 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-text-secondary group-hover:text-text-primary transition-colors">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-text-primary text-sm">{title}</span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 text-text-tertiary group-hover:text-text-primary transition-colors shrink-0"
            />
          </div>
          <p className="mt-1 text-xs text-text-secondary leading-relaxed">{body}</p>
        </div>
      </div>
    </Link>
  );
}
