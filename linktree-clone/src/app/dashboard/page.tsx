import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./ProfileForm";
import { AddLinkForm, LinksList } from "./LinkForm";
import { EarningsButton } from "./EarningsButton";
import { PayoutPortal } from "./PayoutPortal";
import { ThemePicker } from "./ThemePicker";
import { SocialsManager } from "./SocialsManager";
import { AvatarUpload } from "./AvatarUpload";
import { ProfileRender } from "@/components/ProfileRender";
import {
  resolveAccent,
  type CardStyleKey,
  DEFAULT_CARD_STYLE,
} from "@/lib/theme";
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  const creator = await prisma.creator.findUnique({
    where: { userId: userId! },
    include: {
      links: { orderBy: { sortOrder: "asc" } },
      socials: { orderBy: { sortOrder: "asc" } },
    },
  });

  const cookieStore = await cookies();
  const intendedHandle = cookieStore.get("intended_handle")?.value;

  const accent = resolveAccent(creator?.accentColor);

  // The live preview always renders, even before the creator has saved.
  // When the creator row doesn't exist yet, fall back to a placeholder
  // shaped like Creator so ProfileRender can read it without optional
  // chaining everywhere.
  const previewCreator =
    creator ?? {
      handle: "yourname",
      title: "Your name",
      bio: "Save your profile to start customizing your page.",
      avatarUrl: null,
      accentColor: accent.key,
      unlockPrice: 500,
      cardStyle: DEFAULT_CARD_STYLE,
      bgKind: "auto",
      bgValue: null,
      textColor: "auto",
    };
  const previewLinks = creator?.links ?? [];
  const previewSocials = creator?.socials ?? [];

  const displayName = creator?.title || creator?.handle || "your name";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border-muted)] bg-[var(--background)]/85 px-6 py-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">
            Linkstacks
          </span>
          <span className="select-none text-sm text-neutral-300">/</span>
          <span className="text-sm text-neutral-500">Dashboard</span>
        </div>

        <div className="flex items-center gap-4">
          {creator && (
            <a
              href={`/u/${creator.handle}`}
              target="_blank"
              className="text-xs text-neutral-500 transition-colors hover:text-neutral-900"
            >
              View page
            </a>
          )}
          <a
            href="/api/auth/logout"
            className="text-xs text-neutral-400 transition-colors hover:text-neutral-900"
          >
            Log out
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-12 min-w-0">
          <Section title="Profile">
            <div className="mb-5">
              <AvatarUpload
                current={creator?.avatarUrl ?? null}
                hasProfile={!!creator}
                displayName={displayName}
              />
            </div>
            <ProfileForm creator={creator} intendedHandle={intendedHandle} />
          </Section>

          <Section title="Theme">
            <ThemePicker
              hasProfile={!!creator}
              accentColor={creator?.accentColor ?? "violet"}
              cardStyle={(creator?.cardStyle as CardStyleKey) ?? "default"}
              bgKind={creator?.bgKind ?? "auto"}
              bgValue={creator?.bgValue ?? null}
              textColor={creator?.textColor ?? "auto"}
            />
          </Section>

          <Section title="Links">
            {!creator ? (
              <p className="text-sm text-neutral-400 mb-4">
                Save your profile first to start adding links.
              </p>
            ) : (
              <>
                <LinksList links={creator.links} />
                <AddLinkForm />
              </>
            )}
          </Section>

          <Section title="Socials">
            <SocialsManager
              socials={creator?.socials ?? []}
              hasProfile={!!creator}
            />
          </Section>

          <Section title="Earnings">
            {creator ? (
              <EarningsButton
                enrolled={!!creator.whopCompanyId}
                payoutEnabled={creator.payoutEnabled}
              />
            ) : (
              <p className="text-sm text-neutral-400">
                Save your profile first to enable earnings.
              </p>
            )}
          </Section>

          {creator?.payoutEnabled && (
            <Section title="Payouts">
              <PayoutPortal companyId={creator.whopCompanyId!} />
            </Section>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
              Live preview
            </p>
            <div className="rounded-2xl border border-neutral-200 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <ProfileRender
                creator={previewCreator}
                links={previewLinks}
                socials={previewSocials}
                hasPaidUnlock={false}
                hasEarnings={!!creator?.whopCompanyId}
                scale="preview"
              />
            </div>
            {creator && (
              <p className="text-xs text-neutral-400 text-center">
                This is what visitors see at{" "}
                <a
                  href={`/u/${creator.handle}`}
                  target="_blank"
                  className="underline hover:text-neutral-900"
                >
                  /u/{creator.handle}
                </a>
              </p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}
