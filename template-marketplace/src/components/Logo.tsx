import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark className="h-10 w-10" />
      <span className="font-display text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
        stax
      </span>
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      {/* Bottom card, furthest back, dimmest */}
      <rect
        x="9"
        y="12.5"
        width="20"
        height="13"
        rx="2.5"
        fill="var(--color-accent)"
        opacity="0.32"
      />
      {/* Middle card */}
      <rect
        x="6.5"
        y="9.5"
        width="20"
        height="13"
        rx="2.5"
        fill="var(--color-accent)"
        opacity="0.6"
      />
      {/* Top card, full accent */}
      <rect
        x="4"
        y="6.5"
        width="20"
        height="13"
        rx="2.5"
        fill="var(--color-accent)"
      />
      {/* Subtle highlight bar on top card to suggest "S" or content */}
      <rect
        x="7"
        y="9.5"
        width="9"
        height="1.5"
        rx="0.75"
        fill="white"
        opacity="0.85"
      />
      <rect
        x="7"
        y="13"
        width="6"
        height="1.5"
        rx="0.75"
        fill="white"
        opacity="0.6"
      />
    </svg>
  );
}
