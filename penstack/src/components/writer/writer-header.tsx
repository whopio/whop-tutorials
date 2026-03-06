"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, CreditCard, Settings } from "lucide-react";
import { CATEGORY_LABELS } from "@/constants/categories";
import { formatCount } from "@/lib/utils";
import { SubscribeButton } from "@/components/writer/subscribe-button";
import type { PublicationCategory } from "@/generated/prisma/browser";

interface WriterHeaderProps {
  writer: {
    id: string;
    handle: string;
    name: string;
    bio?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    category: string;
    monthlyPriceInCents?: number | null;
    _count: { followers: number; subscriptions: number };
  };
  isOwner?: boolean;
  isFollowing?: boolean;
  isSubscribed?: boolean;
  currentUserId?: string;
  hasCheckout?: boolean;
}

export function WriterHeader({
  writer,
  isOwner,
  isFollowing: initialFollowing,
  isSubscribed,
  currentUserId,
  hasCheckout,
}: WriterHeaderProps) {
  const [following, setFollowing] = useState(initialFollowing ?? false);
  const [followerCount, setFollowerCount] = useState(
    writer._count.followers
  );

  const isLoggedIn = !!currentUserId;

  async function handleFollow() {
    if (!isLoggedIn) {
      window.location.href = `/api/auth/login?returnTo=/${writer.handle}`;
      return;
    }

    setFollowing(!following);
    setFollowerCount((c) => (following ? c - 1 : c + 1));

    try {
      const res = await fetch(`/api/writers/${writer.id}/follow`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setFollowing(data.following);
      setFollowerCount(data.count);
    } catch {
      setFollowing(following);
      setFollowerCount(writer._count.followers);
    }
  }

  return (
    <div>
      {/* Banner */}
      <div className="h-48 w-full bg-gradient-to-r from-gray-100 to-gray-200 sm:h-64">
        {writer.bannerUrl && (
          <img
            src={writer.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="mx-auto max-w-3xl px-4">
        {/* Avatar */}
        <div className="-mt-12 mb-4">
          {writer.avatarUrl ? (
            <img
              src={writer.avatarUrl}
              alt={writer.name}
              className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gray-200 text-2xl font-bold text-gray-600 shadow-sm">
              {writer.name[0]}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-gray-900">
              {writer.name}
            </h1>
            {writer.bio && (
              <p className="mt-1 text-gray-600">{writer.bio}</p>
            )}
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
              <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium">
                {CATEGORY_LABELS[writer.category as PublicationCategory] ??
                  writer.category}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {formatCount(followerCount)} followers
              </span>
              <span className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                {formatCount(writer._count.subscriptions)} subscribers
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isOwner ? (
              <Link href="/dashboard" className="btn-secondary">
                <Settings className="mr-1.5 h-4 w-4" />
                Dashboard
              </Link>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  className={following ? "btn-secondary" : "btn-ghost border border-gray-300"}
                >
                  {following ? "Following" : "Follow"}
                </button>
                {writer.monthlyPriceInCents && writer.monthlyPriceInCents > 0 && (
                  <SubscribeButton
                    writerId={writer.id}
                    writerName={writer.name}
                    price={writer.monthlyPriceInCents}
                    isSubscribed={isSubscribed}
                    hasCheckout={hasCheckout}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
