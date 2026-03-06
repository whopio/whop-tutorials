"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PostCard } from "@/components/post/post-card";

interface FeedPost {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: Date | string | null;
  viewCount: number;
  visibility: string;
  content: unknown;
  writer: {
    handle: string;
    name: string;
    avatarUrl?: string | null;
  };
  _count: { likes: number };
}

interface PostFeedProps {
  initialPosts: FeedPost[];
  initialCursor?: string | null;
  category?: string;
}

export function PostFeed({ initialPosts, initialCursor }: PostFeedProps) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");

  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("cursor", cursor);
      if (category) params.set("category", category);

      const res = await fetch(`/api/posts?${params.toString()}`);
      const data = await res.json();

      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor ?? null);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {posts.length === 0 ? (
        <p className="py-12 text-center text-gray-500">No posts yet</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
      {cursor && (
        <div className="flex justify-center py-8">
          <button
            onClick={loadMore}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
