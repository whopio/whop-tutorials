import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Storyline home"
      className={cn(
        "font-display text-[24px] sm:text-[28px] font-medium tracking-tight text-text-primary",
        className,
      )}
    >
      Storyline
    </Link>
  );
}
