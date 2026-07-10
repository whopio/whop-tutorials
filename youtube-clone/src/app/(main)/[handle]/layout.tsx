import type { ReactNode } from "react";
import { User } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getChannelSocial } from "@/lib/social";
import { getChannelVideoCount, resolveChannel } from "@/lib/channels";
import { channelHasShorts } from "@/lib/shorts";
import { getChannelTiers, isActiveMember } from "@/lib/membership";
import { isSandbox } from "@/lib/env";
import { SubscribeButton } from "@/components/watch/subscribe-button";
import { JoinMembership } from "@/components/channel/join-membership";
import { ChannelTabs } from "@/components/channel/channel-tabs";
import { formatCompact, formatSubscribers } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const channel = await resolveChannel(handle);
  return { title: `${channel.name} - Wavora` };
}

/**
 * CHANNEL-3/4: the shared channel header (banner, avatar, name, @handle,
 * subscriber + video counts, subscribe) and tab strip. The active tab's content
 * renders as {children} from the per-tab pages.
 */
export default async function ChannelLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ handle: string }>;
}) {
  const { handle: raw } = await params;
  const channel = await resolveChannel(raw);
  const user = await getCurrentUser();
  const [videoCount, social, tiers, member, hasShorts] = await Promise.all([
    getChannelVideoCount(channel.id),
    getChannelSocial(channel.id, user?.id),
    channel.membershipsEnabled
      ? getChannelTiers(channel.id)
      : Promise.resolve([]),
    user && channel.membershipsEnabled
      ? isActiveMember(user.id, channel.id)
      : Promise.resolve(false),
    channelHasShorts(channel.id),
  ]);

  return (
    <div className="mx-auto max-w-[1280px]">
      {channel.bannerUrl ? (
        <div className="mb-4 aspect-[6/1] w-full overflow-hidden rounded-xl bg-hover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={channel.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-4 py-4 sm:flex-row sm:items-end">
        <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-full bg-hover sm:h-40 sm:w-40">
          {channel.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-16 w-16 text-fg-muted" />
          )}
        </div>

        <div className="min-w-0 text-center sm:text-left">
          <h1 className="text-2xl font-bold sm:text-3xl">{channel.name}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            <span className="font-medium text-fg">@{channel.handle}</span>
            {" • "}
            {formatSubscribers(social.subscriberCount)}
            {" • "}
            {formatCompact(videoCount)} video{videoCount === 1 ? "" : "s"}
          </p>
          {channel.description ? (
            <p className="mt-2 line-clamp-1 max-w-xl text-sm text-fg-muted">
              {channel.description}
            </p>
          ) : null}
          <div className="mt-4 flex justify-center gap-2 sm:justify-start">
            <SubscribeButton
              channelId={channel.id}
              isOwner={user?.id === channel.userId}
              isSignedIn={Boolean(user)}
              initialSubscribed={social.isSubscribed}
              initialNotify={social.notifyLevel}
            />
            {channel.membershipsEnabled && user?.id !== channel.userId ? (
              <JoinMembership
                tiers={tiers}
                isSignedIn={Boolean(user)}
                isMember={member}
                environment={isSandbox() ? "sandbox" : "production"}
              />
            ) : null}
          </div>
        </div>
      </div>

      <ChannelTabs
        handle={channel.handle}
        showShorts={hasShorts}
        showMembership={channel.membershipsEnabled}
      />

      {children}
    </div>
  );
}
