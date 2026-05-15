import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--color-border)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-xs text-[var(--color-text-secondary)]">
            © {new Date().getFullYear()}
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Templates for every tool. Powered by{" "}
          <a
            href="https://whop.com"
            className="font-medium text-[var(--color-text-primary)] underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Whop
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
