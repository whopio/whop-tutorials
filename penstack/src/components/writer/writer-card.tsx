import Link from "next/link";
import { Users } from "lucide-react";
import { CATEGORY_LABELS } from "@/constants/categories";
import { formatCount, truncate } from "@/lib/utils";
import type { PublicationCategory } from "@/generated/prisma/client";

interface WriterCardProps {
  writer: {
    id: string;
    handle: string;
    name: string;
    bio?: string | null;
    avatarUrl?: string | null;
    category: string;
    _count: { followers: number; subscriptions: number };
  };
}

export function WriterCard({ writer }: WriterCardProps) {
  return (
    <Link
      href={`/${writer.handle}`}
      className="card flex w-64 shrink-0 flex-col gap-3 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        {writer.avatarUrl ? (
          <img
            src={writer.avatarUrl}
            alt={writer.name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
            {writer.name[0]}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {writer.name}
          </h3>
          <span className="text-xs text-gray-500">
            {CATEGORY_LABELS[writer.category as PublicationCategory] ??
              writer.category}
          </span>
        </div>
      </div>

      {writer.bio && (
        <p className="text-xs text-gray-500 line-clamp-2">
          {truncate(writer.bio, 100)}
        </p>
      )}

      <div className="flex items-center gap-1 text-xs text-gray-400">
        <Users className="h-3 w-3" />
        {formatCount(writer._count.followers)} followers
      </div>
    </Link>
  );
}
