import type { Creator, Link as DbLink } from "@prisma/client";
import { resolveAccent, accentVars } from "@/lib/theme";
import { ReactNode } from "react";

// The shared profile renderer used by both the public /u/[handle] page and
// the live preview in the creator dashboard. Identical layout and styling
// in both places, parameterized by `interactive` (whether unlocked premium
// links and the unlock CTA are clickable forms or display-only previews).

export interface ProfileRenderProps {
  creator: Pick<
    Creator,
    "handle" | "title" | "bio" | "avatarUrl" | "accentColor" | "unlockPrice"
  >;
  links: Array<
    Pick<DbLink, "id" | "title" | "url" | "isPremium" | "isVisible">
  >;
  hasPaidUnlock: boolean;
  hasEarnings: boolean;
  // Render the unlock CTA as the live UnlockButton form. When false, render
  // a non-interactive button preview (used inside the dashboard live preview).
  unlockSlot?: ReactNode;
  // Visual scale: "full" for the actual page, "preview" for the dashboard
  // pane (slightly smaller spacing).
  scale?: "full" | "preview";
}

const PRICE_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function ProfileRender({
  creator,
  links,
  hasPaidUnlock,
  hasEarnings,
  unlockSlot,
  scale = "full",
}: ProfileRenderProps) {
  const accent = resolveAccent(creator.accentColor);
  const visibleLinks = links.filter((l) => l.isVisible);
  const freeLinks = visibleLinks.filter((l) => !l.isPremium);
  const premiumLinks = visibleLinks.filter((l) => l.isPremium);

  const displayName = creator.title || creator.handle;
  const initial = displayName.charAt(0).toUpperCase();
  const priceLabel = PRICE_FORMATTER.format(creator.unlockPrice / 100);

  // Slightly tighter rhythm in preview mode.
  const containerPad = scale === "preview" ? "px-5 py-8" : "px-6 py-12";
  const avatarSize = scale === "preview" ? "w-16 h-16 text-xl" : "w-20 h-20 text-2xl";
  const nameSize = scale === "preview" ? "text-xl" : "text-2xl";

  return (
    <div
      className="bg-white text-neutral-900 min-h-full font-sans"
      style={accentVars(accent)}
    >
      <div className={`mx-auto w-full max-w-md ${containerPad}`}>
        {/* Hero: avatar + name + bio */}
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
              className={`${avatarSize} rounded-full mx-auto mb-4 flex items-center justify-center text-white font-semibold tracking-tight`}
              style={{ background: "var(--accent)" }}
            >
              {initial}
            </div>
          )}

          <h1
            className={`${nameSize} font-semibold tracking-tight text-neutral-900`}
          >
            {displayName}
          </h1>

          {creator.bio && (
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 max-w-xs mx-auto">
              {creator.bio}
            </p>
          )}
        </header>

        {/* Free link stack */}
        <div className="space-y-2.5">
          {freeLinks.map((link) => (
            <LinkCard key={link.id} link={link} interactive={scale === "full"} />
          ))}
        </div>

        {/* Premium section */}
        {premiumLinks.length > 0 && (
          <div className="mt-8 pt-8 border-t border-neutral-100">
            {hasPaidUnlock ? (
              <div className="space-y-2.5">
                {premiumLinks.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    interactive={scale === "full"}
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
                    />
                  ))}
                </div>

                {hasEarnings ? (
                  unlockSlot ?? (
                    <UnlockPreviewButton priceLabel={priceLabel} />
                  )
                ) : (
                  <p className="text-xs text-center text-neutral-400">
                    Premium links coming soon.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {visibleLinks.length === 0 && (
          <p className="text-sm text-center text-neutral-400 mt-8">
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
}: {
  link: { id: string; title: string; url: string; isPremium: boolean };
  interactive: boolean;
}) {
  const Tag = interactive ? "a" : "div";
  const props: Record<string, string> = interactive
    ? { href: link.url, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Tag
      {...props}
      className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-3.5 text-sm font-medium text-neutral-900 transition-colors hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-bg)]"
    >
      <span className="flex-1 text-center">{link.title}</span>
    </Tag>
  );
}

function PremiumPlaceholderCard({
  title,
  priceLabel,
}: {
  title: string;
  priceLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-3.5 text-sm font-medium text-neutral-900">
      <span className="flex-1 text-center text-neutral-400">{title}</span>
      <span
        className="ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight"
        style={{
          background: "var(--accent-bg)",
          color: "var(--accent)",
        }}
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
