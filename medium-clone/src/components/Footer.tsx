import Link from "next/link";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "/membership", label: "Subscribe" },
  { href: "/topics", label: "Topics" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="mx-auto max-w-[1336px] px-4 sm:px-6 py-6 sm:py-8 flex flex-wrap items-center justify-between gap-4">
        <Logo className="text-[20px]" />
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-text-primary">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
