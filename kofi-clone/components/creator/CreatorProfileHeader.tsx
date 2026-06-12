/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCreatorLite, getViewerContext } from "@/lib/creator";
import { accentHex } from "@/lib/accent";
import CreatorTabs from "@/components/creator/CreatorTabs";
import FollowButton from "@/components/creator/FollowButton";
import BrandIcon from "@/components/BrandIcon";
import { Button } from "@whop/react/components";

export default async function CreatorProfileHeader({ username }: { username: string }) {
  const creator = await getCreatorLite(username);
  if (!creator) return null;

  const [supportersCount, followersCount, viewer] = await Promise.all([
    prisma.support.count({ where: { creatorId: creator.id, status: "COMPLETED" } }),
    prisma.follow.count({ where: { creatorId: creator.id } }),
    getViewerContext(creator.id, creator.userId),
  ]);

  const accent = accentHex(creator.accentColor);

  return (
    <>
      <div
        className="h-40 w-full sm:h-56"
        style={{
          background: creator.coverImageUrl
            ? `url(${creator.coverImageUrl}) center/cover`
            : `linear-gradient(120deg, ${accent}, ${accent}99)`,
        }}
      />
      <div className="mx-auto max-w-5xl px-5">
        <div className="-mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={creator.displayName}
                className="h-24 w-24 rounded-full border-4 border-surface object-cover"
              />
            ) : (
              <div
                className="grid h-24 w-24 place-items-center rounded-full border-4 border-surface text-4xl text-white"
                style={{ background: accent }}
              >
                {creator.displayName.charAt(0)}
              </div>
            )}
            <div className="pb-1">
              <h1 className="text-2xl font-bold">{creator.displayName}</h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                <BrandIcon name="heart" className="h-4 w-4" />
                <span>{supportersCount} {supportersCount === 1 ? "supporter" : "supporters"}</span>
                <span aria-hidden="true">·</span>
                <span>{followersCount} {followersCount === 1 ? "follower" : "followers"}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <FollowButton username={username} initialFollowing={viewer.isFollowing} isLoggedIn={Boolean(viewer.userId)} />
            <a href={`/${username}#support`} className="btn-pill btn-accent text-sm sm:hidden">
              Tip
            </a>
            {viewer.isOwner ? (
              <Button asChild size="2" variant="surface" color="gray">
                <Link href="/dashboard/settings">Edit page</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-5">
        <CreatorTabs username={username} />
      </div>
    </>
  );
}
