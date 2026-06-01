import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";

export interface StoryCardData {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  coverImageUrl: string | null;
  readingTimeMinutes: number;
  likesTotal: number;
  visibility: "FREE" | "PLUS";
  publishedAt: Date | null;
  author: {
    username: string;
    name: string | null;
  };
  topics: { slug: string; name: string }[];
}

function formatDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function StoryCard({ story }: { story: StoryCardData }) {
  const href = `/@${story.author.username}/${story.slug}`;
  return (
    <article className="py-6 border-b border-border last:border-0">
      <div className="flex items-start gap-6">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-text-secondary mb-2 flex items-center gap-2">
            <Link href={`/@${story.author.username}`} className="hover:underline">
              {story.author.name || `@${story.author.username}`}
            </Link>
            {story.topics[0] && (
              <>
                <span aria-hidden="true">·</span>
                <Link
                  href={`/tag/${story.topics[0].slug}`}
                  className="hover:underline"
                >
                  in {story.topics[0].name}
                </Link>
              </>
            )}
          </div>
          <Link href={href} className="block group">
            <h2 className="font-sans font-bold text-[18px] sm:text-[20px] leading-tight text-text-primary line-clamp-2 group-hover:underline">
              {story.title}
            </h2>
            {story.subtitle && (
              <p className="mt-1 text-[14px] sm:text-[15px] text-text-secondary line-clamp-2">
                {story.subtitle || story.excerpt}
              </p>
            )}
            {!story.subtitle && story.excerpt && (
              <p className="mt-1 text-[14px] sm:text-[15px] text-text-secondary line-clamp-2">
                {story.excerpt}
              </p>
            )}
          </Link>
          <div className="mt-3 flex items-center gap-3 text-[13px] text-text-tertiary">
            <span>{formatDate(story.publishedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{story.readingTimeMinutes} min read</span>
            {story.visibility === "PLUS" && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-pill bg-plus/15 text-[12px]">
                <Star aria-hidden="true" className="size-3 fill-plus stroke-plus" />
                <span className="text-text-primary font-medium">Plus</span>
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span>{story.likesTotal} {story.likesTotal === 1 ? "like" : "likes"}</span>
          </div>
        </div>
        {story.coverImageUrl && (
          <Link href={href} className="shrink-0">
            <Image
              src={story.coverImageUrl}
              alt=""
              width={160}
              height={160}
              sizes="(max-width: 640px) 112px, 160px"
              className="size-[112px] sm:size-[160px] object-cover rounded-sm"
            />
          </Link>
        )}
      </div>
    </article>
  );
}

