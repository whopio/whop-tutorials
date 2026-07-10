import { resolveChannel } from "@/lib/channels";
import { getChannelTiers, isActiveMember } from "@/lib/membership";
import { getCurrentUser } from "@/lib/session";
import { isSandbox } from "@/lib/env";
import { JoinMembership } from "@/components/channel/join-membership";

/** CHANNEL-11 / MEMBERSHIP-3: the channel Membership tab — tiers + a join entry. */
export default async function ChannelMembershipPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const channel = await resolveChannel(handle);

  if (!channel.membershipsEnabled) {
    return (
      <p className="py-16 text-center text-sm text-fg-muted">
        This channel doesn&apos;t offer memberships yet.
      </p>
    );
  }

  const user = await getCurrentUser();
  const [tiers, member] = await Promise.all([
    getChannelTiers(channel.id),
    user ? isActiveMember(user.id, channel.id) : Promise.resolve(false),
  ]);

  return (
    <div className="max-w-2xl">
      <h2 className="mb-1 text-lg font-bold">Channel memberships</h2>
      <p className="mb-4 text-sm text-fg-muted">
        Support {channel.name} with a monthly membership and unlock members-only
        perks.
      </p>

      <div className="flex flex-col gap-3">
        {tiers.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border p-4"
          >
            <div className="min-w-0">
              <p className="font-medium">{t.name}</p>
              {t.description ? (
                <p className="text-sm text-fg-muted">{t.description}</p>
              ) : null}
            </div>
            <span className="shrink-0 font-medium">
              ${(t.priceCents / 100).toFixed(2)}/mo
            </span>
          </div>
        ))}
      </div>

      {user?.id !== channel.userId ? (
        <div className="mt-5">
          <JoinMembership
            tiers={tiers}
            isSignedIn={Boolean(user)}
            isMember={member}
            environment={isSandbox() ? "sandbox" : "production"}
          />
        </div>
      ) : null}
    </div>
  );
}
