import { resolveAccent, accentVars } from "@/lib/theme";

// Compact, non-interactive mockup of a creator profile, used as decorative
// content in the homepage hero. Visually mirrors the real ProfileRender
// component (same card style, price chip, accent token usage) so it doubles
// as a product preview.

export interface HeroProfileCardProps {
  name: string;
  handle: string;
  bio: string;
  accent: string;
  initial?: string;
  freeLinks: readonly string[];
  premium?: { title: string; price: number };
}

export function HeroProfileCard({
  name,
  handle,
  bio,
  accent,
  initial,
  freeLinks,
  premium,
}: HeroProfileCardProps) {
  const a = resolveAccent(accent);
  const firstChar = (initial ?? name).charAt(0).toUpperCase();

  return (
    <div
      className="w-[260px] rounded-2xl border border-neutral-200/80 bg-white px-5 py-6 shadow-[0_18px_50px_-22px_rgba(15,15,18,0.20),0_2px_4px_rgba(15,15,18,0.04)]"
      style={accentVars(a)}
    >
      <div className="text-center">
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-white"
          style={{ background: "var(--accent)" }}
          aria-hidden
        >
          {firstChar}
        </div>
        <p className="text-[15px] font-semibold tracking-tight text-neutral-900">
          {name}
        </p>
        <p className="mt-0.5 text-[11px] text-neutral-400">/u/{handle}</p>
        <p className="mt-2 text-[12px] leading-snug text-neutral-500 line-clamp-2">
          {bio}
        </p>
      </div>

      <div className="mt-4 space-y-1.5">
        {freeLinks.map((title) => (
          <div
            key={title}
            className="flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] font-medium text-neutral-900"
          >
            {title}
          </div>
        ))}
        {premium && (
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] font-medium">
            <span className="flex-1 text-center text-neutral-400">
              {premium.title}
            </span>
            <span
              className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-tight"
              style={{
                background: "var(--accent-bg)",
                color: "var(--accent)",
              }}
            >
              ${premium.price}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
