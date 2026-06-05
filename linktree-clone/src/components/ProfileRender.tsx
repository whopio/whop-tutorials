import type {
  Creator,
  Link as DbLink,
  SocialLink as DbSocialLink,
} from "@prisma/client";
import {
  accentVars,
  resolveAccent,
  resolveBackground,
  resolveTextColor,
} from "@/lib/theme";
import { getSocialPlatform } from "@/lib/socials";
import { ReactNode } from "react";

// The shared profile renderer used by both the public /u/[handle] page and
// the live preview in the creator dashboard. Identical layout in both
// places; parameterized by `interactive` (whether links/CTAs are clickable)
// and `scale` (full page vs preview pane).

export interface ProfileRenderProps {
  creator: Pick<
    Creator,
    | "handle"
    | "title"
    | "bio"
    | "avatarUrl"
    | "accentColor"
    | "unlockPrice"
    | "cardStyle"
    | "bgKind"
    | "bgValue"
    | "textColor"
  >;
  links: Array<
    Pick<DbLink, "id" | "title" | "url" | "isPremium" | "isVisible">
  >;
  socials?: Array<Pick<DbSocialLink, "id" | "platform" | "url" | "color">>;
  hasPaidUnlock: boolean;
  hasEarnings: boolean;
  unlockSlot?: ReactNode;
  scale?: "full" | "preview";
}

const PRICE_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// Style map for the card-style preset. Each entry is a className applied to
// every link card in the rendered profile.
const CARD_STYLE_CLASSES: Record<string, string> = {
  default:
    "rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]",
  pill: "rounded-full border border-[var(--card-border)] bg-[var(--card-bg)]",
  soft: "rounded-md border border-[var(--card-border)] bg-[var(--card-bg)]",
  square: "rounded-none border border-[var(--card-border)] bg-[var(--card-bg)]",
  outline:
    "rounded-xl border-2 border-[var(--card-border)] bg-transparent",
  elevated:
    "rounded-xl bg-[var(--card-bg)] shadow-[0_8px_24px_-6px_rgba(15,15,18,0.18),0_2px_4px_rgba(15,15,18,0.05)]",
  // Wavy edges. The SVG mask carves a wave shape into the bottom edge of
  // every card. Falls back to the default rounded style if mask-image
  // is unsupported.
  wave: "rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] [mask-image:radial-gradient(circle_8px_at_50%_100%,transparent_98%,#000_100%)]",
};

export function ProfileRender({
  creator,
  links,
  socials = [],
  hasPaidUnlock,
  hasEarnings,
  unlockSlot,
  scale = "full",
}: ProfileRenderProps) {
  const accent = resolveAccent(creator.accentColor);
  const bg = resolveBackground(creator.bgKind, creator.bgValue);
  const text = resolveTextColor(creator.textColor, bg.isDark);

  const visibleLinks = links.filter((l) => l.isVisible);
  const freeLinks = visibleLinks.filter((l) => !l.isPremium);
  const premiumLinks = visibleLinks.filter((l) => l.isPremium);

  const displayName = creator.title || creator.handle;
  const initial = displayName.charAt(0).toUpperCase();
  const priceLabel = PRICE_FORMATTER.format(creator.unlockPrice / 100);

  const cardClass =
    CARD_STYLE_CLASSES[creator.cardStyle] ?? CARD_STYLE_CLASSES.default;

  const containerPad = scale === "preview" ? "px-5 py-8" : "px-6 py-12";
  const avatarSize =
    scale === "preview" ? "w-16 h-16 text-xl" : "w-20 h-20 text-2xl";
  const nameSize = scale === "preview" ? "text-xl" : "text-2xl";

  // The wrapper carries all theme tokens. `--card-bg` and `--card-border`
  // are dialed against the page background so cards still feel like
  // floating surfaces on dark gradients.
  const wrapperStyle: React.CSSProperties = {
    ...accentVars(accent),
    background: bg.css !== "transparent" ? bg.css : undefined,
    color: text.color,
    "--card-bg": bg.isDark ? "rgba(255,255,255,0.95)" : "#ffffff",
    "--card-border": bg.isDark ? "rgba(0,0,0,0.08)" : "#e7e5e4",
    "--text-color": text.color,
    "--text-muted": text.muted,
  } as React.CSSProperties;

  return (
    <div
      className="min-h-full font-sans transition-colors"
      style={wrapperStyle}
    >
      <div className={`mx-auto w-full max-w-md ${containerPad}`}>
        <header className="text-center mb-8">
          {creator.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.avatarUrl}
              alt={displayName}
              className={`${avatarSize} rounded-full mx-auto mb-4 object-cover`}
            />
          ) : (
            <div
              className={`${avatarSize} rounded-full mx-auto mb-4 flex items-center justify-center font-semibold tracking-tight text-white`}
              style={{ background: "var(--accent)" }}
              aria-hidden
            >
              {initial}
            </div>
          )}

          <h1
            className={`${nameSize} font-semibold tracking-tight`}
            style={{ color: "var(--text-color)" }}
          >
            {displayName}
          </h1>

          {creator.bio && (
            <p
              className="mt-2 text-sm leading-relaxed max-w-xs mx-auto"
              style={{ color: "var(--text-muted)" }}
            >
              {creator.bio}
            </p>
          )}

          {socials.length > 0 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              {socials.map((s) => {
                const platform = getSocialPlatform(s.platform);
                if (!platform) return null;
                const color = s.color ?? platform.brandColor;
                const href = platform.hrefBuilder
                  ? platform.hrefBuilder(s.url)
                  : s.url;
                const Tag = scale === "full" ? "a" : "div";
                const props =
                  scale === "full"
                    ? { href, target: "_blank", rel: "noopener noreferrer" }
                    : {};
                return (
                  <Tag
                    key={s.id}
                    {...props}
                    aria-label={platform.label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-80"
                    style={{ color }}
                  >
                    <svg
                      role="img"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      width="20"
                      height="20"
                      fill="currentColor"
                    >
                      <path d={platform.path} />
                    </svg>
                  </Tag>
                );
              })}
            </div>
          )}
        </header>

        <div className="space-y-2.5">
          {freeLinks.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              interactive={scale === "full"}
              cardClass={cardClass}
            />
          ))}
        </div>

        {premiumLinks.length > 0 && (
          <div className="mt-8 pt-8 border-t border-[var(--card-border)]">
            {hasPaidUnlock ? (
              <div className="space-y-2.5">
                {premiumLinks.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    interactive={scale === "full"}
                    cardClass={cardClass}
                  />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-2.5 mb-5">
                  {premiumLinks.map((link) => (
                    <PremiumPlaceholderCard
                      key={link.id}
                      title={link.title}
                      priceLabel={priceLabel}
                      cardClass={cardClass}
                    />
                  ))}
                </div>

                {hasEarnings ? (
                  unlockSlot ?? <UnlockPreviewButton priceLabel={priceLabel} />
                ) : (
                  <p
                    className="text-xs text-center"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Premium links coming soon.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {visibleLinks.length === 0 && (
          <p
            className="text-sm text-center mt-8"
            style={{ color: "var(--text-muted)" }}
          >
            No links yet.
          </p>
        )}
      </div>
    </div>
  );
}

function LinkCard({
  link,
  interactive,
  cardClass,
}: {
  link: { id: string; title: string; url: string; isPremium: boolean };
  interactive: boolean;
  cardClass: string;
}) {
  const Tag = interactive ? "a" : "div";
  const props: Record<string, string> = interactive
    ? { href: link.url, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Tag
      {...props}
      className={`flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-bg)] ${cardClass}`}
      style={{ color: "var(--text-color)" }}
    >
      <span className="flex-1 text-center">{link.title}</span>
    </Tag>
  );
}

function PremiumPlaceholderCard({
  title,
  priceLabel,
  cardClass,
}: {
  title: string;
  priceLabel: string;
  cardClass: string;
}) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3.5 text-sm font-medium ${cardClass}`}
    >
      <span
        className="flex-1 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </span>
      <span
        className="ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight"
        style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
      >
        {priceLabel}
      </span>
    </div>
  );
}

function UnlockPreviewButton({ priceLabel }: { priceLabel: string }) {
  return (
    <div
      className="w-full rounded-xl py-3 px-4 text-sm font-semibold text-white text-center"
      style={{ background: "var(--accent)" }}
    >
      Unlock premium for {priceLabel}
    </div>
  );
}
