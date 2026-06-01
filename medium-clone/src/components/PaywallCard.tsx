import { Star } from "lucide-react";
import { MembershipCTA } from "@/components/checkout/MembershipCTA";

export function PaywallCard({
  authenticated,
  writerName,
  returnTo,
}: {
  authenticated: boolean;
  writerName: string;
  returnTo?: string;
}) {
  const loginHref = `/api/auth/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  return (
    <aside
      aria-label="Plus paywall"
      className="not-prose mt-10 pt-10 border-t border-border text-center font-sans"
    >
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-plus/15 border border-plus/30 text-[12px]">
        <Star aria-hidden="true" className="size-3.5 fill-plus stroke-plus" />
        <span className="font-medium text-text-primary">Paid story</span>
      </div>

      <h2 className="mt-5 text-[18px] font-medium text-text-primary">
        The rest of this story is behind the paywall.
      </h2>
      <p className="mt-2 mx-auto max-w-md text-sm text-text-secondary">
        $5/month unlocks every paid story on Storyline — including this one — and a share goes
        directly to {writerName} based on what you read.
      </p>

      <div className="mt-6 mx-auto max-w-[320px] flex flex-col gap-2">
        <MembershipCTA
          authenticated={authenticated}
          label="Subscribe — $5/month"
          className="inline-flex items-center justify-center w-full px-5 py-3 rounded-pill bg-brand text-white text-sm font-medium hover:bg-brand-hover"
        />
        {!authenticated && (
          <a
            href={loginHref}
            className="inline-flex items-center justify-center w-full px-5 py-3 rounded-pill border border-text-primary text-text-primary text-sm font-medium hover:bg-text-primary hover:text-background transition-colors"
          >
            Already subscribed? Sign in
          </a>
        )}
      </div>
    </aside>
  );
}
