import { notFound } from "next/navigation";
import Link from "next/link";
import { User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getRelatedVideos } from "@/lib/videos";
import { getChannelSocial, getVideoReactions } from "@/lib/social";
import { getCommentsData } from "@/lib/comments";
import { isInWatchLater } from "@/lib/library";
import { getPlaylistsForPicker } from "@/lib/playlists";
import { isActiveMember } from "@/lib/membership";
import { getResumePosition } from "@/lib/history";
import { isSandbox } from "@/lib/env";
import {
  formatDuration,
  formatSubscribers,
  formatTimeAgo,
  formatViews,
} from "@/lib/format";
import type { FeedVideo } from "@/components/feed/video-card";
import { SubscribeButton } from "@/components/watch/subscribe-button";
import { LikeDislike } from "@/components/watch/like-dislike";
import { SaveMenu } from "@/components/watch/save-menu";
import { SuperThanks } from "@/components/watch/super-thanks";
import { WatchPlayer } from "@/components/watch/watch-player";
import { Comments } from "@/components/comments/comments";
import { ViewTracker } from "./view-tracker";

type SearchParams = Promise<{ v?: string | string[] }>;

export default async function WatchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { v: rawV } = await searchParams;
  const v = Array.isArray(rawV) ? rawV[0] : rawV;
  if (!v) notFound();

  const video = await prisma.video.findUnique({
    where: { id: v },
    include: {
      channel: {
        select: {
          handle: true,
          name: true,
          avatarUrl: true,
          userId: true,
          whopCompanyId: true,
          superThanksEnabled: true,
        },
      },
    },
  });
  if (!video || video.status !== "READY" || !video.videoUrl) notFound();

  const user = await getCurrentUser();

  // PRIVATE videos are playable only by their owner (VIDEO-9).
  if (video.visibility === "PRIVATE" && user?.id !== video.channel.userId) {
    notFound();
  }

  const [
    related,
    channelSocial,
    reactions,
    commentsData,
    savedToWatchLater,
    resumeAt,
    pickerPlaylists,
  ] = await Promise.all([
    getRelatedVideos(video.id),
    getChannelSocial(video.channelId, user?.id),
    getVideoReactions(video.id, user?.id),
    getCommentsData(video.id, user?.id, "top"),
    user ? isInWatchLater(user.id, video.id) : Promise.resolve(false),
    user ? getResumePosition(user.id, video.id) : Promise.resolve(0),
    user
      ? getPlaylistsForPicker(user.id, video.id)
      : Promise.resolve([]),
  ]);

  // WATCH-11: members-only videos are gated behind an active membership.
  const isOwner = user?.id === video.channel.userId;
  const canWatch =
    !video.membersOnly ||
    isOwner ||
    (user ? await isActiveMember(user.id, video.channelId) : false);

  return (
    <div className="mx-auto flex max-w-[1700px] flex-col gap-6 lg:flex-row">
      {/* Left column: player + meta */}
      <div className="min-w-0 flex-1">
        {canWatch ? (
          <>
            <div className="overflow-hidden rounded-xl bg-black">
              <WatchPlayer
                key={video.id}
                videoId={video.id}
                src={video.videoUrl}
                poster={video.thumbnailUrl ?? undefined}
                resumeAt={resumeAt}
                isSignedIn={Boolean(user)}
              />
            </div>
            <ViewTracker videoId={video.id} />
          </>
        ) : (
          <div
            className="grid aspect-video w-full place-items-center rounded-xl text-center"
            style={
              video.thumbnailUrl
                ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,.7),rgba(0,0,0,.7)), url(${video.thumbnailUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className="max-w-sm p-6 text-white">
              <p className="text-lg font-semibold">Members-only video</p>
              <p className="mt-2 text-sm text-white/80">
                Join {video.channel.name}&apos;s channel membership to watch
                this video.
              </p>
              <Link
                href={`/@${video.channel.handle}`}
                className="mt-4 inline-block rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
              >
                See membership options
              </Link>
            </div>
          </div>
        )}

        <h1 className="mt-3 text-xl font-bold leading-tight">{video.title}</h1>

        {/* Channel row + actions (WATCH-4/5) */}
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/@${video.channel.handle}`}
              className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-hover"
            >
              {video.channel.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.channel.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-fg-muted" />
              )}
            </Link>
            <div className="min-w-0">
              <Link
                href={`/@${video.channel.handle}`}
                className="block truncate font-medium"
              >
                {video.channel.name}
              </Link>
              <p className="truncate text-xs text-fg-muted">
                {formatSubscribers(channelSocial.subscriberCount)}
              </p>
            </div>
            <SubscribeButton
              channelId={video.channelId}
              isOwner={user?.id === video.channel.userId}
              isSignedIn={Boolean(user)}
              initialSubscribed={channelSocial.isSubscribed}
              initialNotify={channelSocial.notifyLevel}
            />
          </div>

          <div className="flex items-center gap-2">
            <LikeDislike
              videoId={video.id}
              isSignedIn={Boolean(user)}
              initialReaction={reactions.myReaction}
              initialLikeCount={reactions.likeCount}
            />
            <SaveMenu
              videoId={video.id}
              isSignedIn={Boolean(user)}
              initialSaved={savedToWatchLater}
              playlists={pickerPlaylists.map((p) => ({
                id: p.id,
                title: p.title,
                contains: p.contains,
              }))}
            />
            {video.channel.whopCompanyId &&
            video.channel.superThanksEnabled &&
            user?.id !== video.channel.userId ? (
              <SuperThanks
                videoId={video.id}
                isSignedIn={Boolean(user)}
                environment={isSandbox() ? "sandbox" : "production"}
              />
            ) : null}
          </div>
        </div>

        {/* Description block with the FEED-3 meta line. */}
        <div className="mt-4 rounded-xl bg-hover p-3 text-sm">
          <p className="font-medium">
            {formatViews(video.viewCount)}
            {video.publishedAt
              ? ` • ${formatTimeAgo(video.publishedAt)}`
              : " • Unpublished"}
          </p>
          {video.description ? (
            <p className="mt-2 whitespace-pre-wrap text-fg">
              {video.description}
            </p>
          ) : null}
        </div>

        {commentsData ? (
          <Comments
            videoId={video.id}
            isSignedIn={Boolean(user)}
            isCreator={commentsData.isCreator}
            myAvatar={user?.avatarUrl ?? null}
            initial={{
              enabled: commentsData.enabled,
              count: commentsData.count,
              comments: commentsData.comments,
            }}
          />
        ) : null}
      </div>

      {/* Right column: up-next / related rail (FEED-9 / WATCH-9). */}
      <aside className="w-full shrink-0 lg:w-[402px]">
        <div className="flex flex-col gap-2">
          {related.map((r) => (
            <RelatedRow key={r.id} video={r} />
          ))}
        </div>
      </aside>
    </div>
  );
}

function RelatedRow({ video }: { video: FeedVideo }) {
  return (
    <Link href={`/watch?v=${video.id}`} className="flex gap-2">
      <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-hover">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
        {video.durationSeconds > 0 ? (
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-xs text-white">
            {formatDuration(video.durationSeconds)}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-medium leading-5">
          {video.title}
        </h3>
        <p className="mt-1 truncate text-xs text-fg-muted">
          {video.channel.name}
        </p>
        <p className="truncate text-xs text-fg-muted">
          {formatViews(video.viewCount)}
          {video.publishedAt ? ` • ${formatTimeAgo(video.publishedAt)}` : ""}
        </p>
      </div>
    </Link>
  );
}
