import Link from "next/link";
import { Heart, Eye } from "lucide-react";
import { formatDate, estimateReadingTime, formatCount } from "@/lib/utils";

interface PostCardWriter {
  handle: string;
  name: string;
  avatarUrl?: string | null;
}

interface PostCardProps {
  post: {
    id: string;
    slug: string;
    title: string;
    subtitle?: string | null;
    coverImageUrl?: string | null;
    publishedAt?: Date | string | null;
    viewCount: number;
    content: unknown;
    writer?: PostCardWriter;
    _count: { likes: number };
  };
  writerHandle?: string;
  writerName?: string;
  writerAvatarUrl?: string | null;
  hideWriter?: boolean;
}

export function PostCard({
  post,
  writerHandle,
  writerName,
  writerAvatarUrl,
  hideWriter,
}: PostCardProps) {
  const readingTime = estimateReadingTime(post.content);
  const handle = post.writer?.handle ?? writerHandle ?? "";
  const name = post.writer?.name ?? writerName ?? "";
  const avatar = post.writer?.avatarUrl ?? writerAvatarUrl;

  return (
    <article className="group py-6">
      <Link href={`/${handle}/${post.slug}`} className="flex gap-6">
        <div className="flex-1">
          {!hideWriter && name && (
            <div className="mb-2 flex items-center gap-2">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-600">
                  {name[0]}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700">{name}</span>
            </div>
          )}

          <h3 className="font-serif text-xl font-bold text-gray-900 group-hover:text-brand-600">
            {post.title}
          </h3>

          {post.subtitle && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {post.subtitle}
            </p>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
            {post.publishedAt && (
              <span>
                {formatDate(
                  typeof post.publishedAt === "string"
                    ? post.publishedAt
                    : post.publishedAt.toISOString()
                )}
              </span>
            )}
            <span>{readingTime} min read</span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {formatCount(post._count.likes)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatCount(post.viewCount)}
            </span>
          </div>
        </div>

        {post.coverImageUrl && (
          <div className="hidden shrink-0 sm:block">
            <img
              src={post.coverImageUrl}
              alt=""
              className="h-28 w-40 rounded-lg object-cover"
            />
          </div>
        )}
      </Link>
    </article>
  );
}
