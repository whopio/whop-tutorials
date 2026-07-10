import { cn } from "@/lib/utils";

/**
 * The Wavora mark: a play triangle riding a wave (our own logo — never YouTube's
 * trademarked play button). Color is inherited via `currentColor`, so wrap it in
 * a `text-*` class (e.g. `text-brand`).
 */
export function WavoraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path
        d="M15 10 L15 32 L34 21 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <path
        d="M12 36 q6 -9 12 0 t12 0"
        fill="none"
        stroke="currentColor"
        strokeWidth={4.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Wavora logo lockup: the play+wave mark in brand red + the wordmark. */
export function WavoraLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex select-none items-center gap-1.5", className)}>
      <WavoraMark className="h-6 w-6 text-brand" />
      <span className="text-[1.3rem] font-bold leading-none tracking-[-0.04em] text-fg">
        Wavora
      </span>
    </span>
  );
}
