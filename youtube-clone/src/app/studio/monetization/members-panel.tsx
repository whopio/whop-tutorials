import { User } from "lucide-react";
import { formatCompact, formatTimeAgo } from "@/lib/format";
import type { RecentMember } from "@/lib/membership";

/**
 * MEMBERSHIP-10: the creator-facing membership roster — a headline active-member
 * count plus the most recently joined supporters.
 */
export function MembersPanel({
  memberCount,
  recentMembers,
}: {
  memberCount: number;
  recentMembers: RecentMember[];
}) {
  return (
    <div className="max-w-lg rounded-2xl border border-border p-6">
      <h2 className="text-lg font-bold">Members</h2>
      <p className="mt-2 text-3xl font-bold">
        {formatCompact(memberCount)}{" "}
        <span className="text-base font-medium text-fg-muted">
          {memberCount === 1 ? "member" : "members"}
        </span>
      </p>

      {recentMembers.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">
          No members yet. Share your channel to get your first supporter.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
          {recentMembers.map((m) => {
            const displayName = m.user.name ?? m.user.username;
            return (
              <li key={m.id} className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-hover">
                  {m.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.user.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-fg-muted" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <p className="truncate text-xs text-fg-muted">
                    @{m.user.username}
                    {m.tier ? ` • ${m.tier.name}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-fg-muted">
                  joined {formatTimeAgo(m.startedAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
