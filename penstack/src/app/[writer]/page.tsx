import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getWriterByHandle, isFollowing } from "@/services/writer-service";
import { getPostsByWriter } from "@/services/post-service";
import { hasActiveSubscription } from "@/services/subscription-service";
import { WriterHeader } from "@/components/writer/writer-header";
import { PostCard } from "@/components/post/post-card";
import { WriterChat } from "@/components/chat/writer-chat";

interface WriterPageProps {
  params: Promise<{ writer: string }>;
}

export async function generateMetadata({
  params,
}: WriterPageProps): Promise<Metadata> {
  const { writer: handle } = await params;
  const writer = await getWriterByHandle(handle);

  if (!writer) {
    return { title: "Writer not found | Penstack" };
  }

  return {
    title: `${writer.name} | Penstack`,
    description: writer.bio ?? `Read ${writer.name} on Penstack`,
    openGraph: {
      title: writer.name,
      description: writer.bio ?? `Read ${writer.name} on Penstack`,
      ...(writer.avatarUrl ? { images: [writer.avatarUrl] } : {}),
    },
  };
}

export default async function WriterPage({ params }: WriterPageProps) {
  const { writer: handle } = await params;
  const writer = await getWriterByHandle(handle);

  if (!writer) notFound();

  const user = await requireAuth({ redirect: false });

  const [{ items: posts }, following, subscribed] = await Promise.all([
    getPostsByWriter(writer.id, { published: true }),
    user ? isFollowing(user.id, writer.id) : Promise.resolve(false),
    user ? hasActiveSubscription(user.id, writer.id) : Promise.resolve(false),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <WriterHeader
        writer={writer}
        isOwner={user?.id === writer.userId}
        isFollowing={following}
        isSubscribed={subscribed}
        currentUserId={user?.id}
        hasCheckout={!!writer.whopCompanyId && !!writer.kycCompleted}
      />

      <section className="mt-10">
        <h2 className="mb-6 font-serif text-xl font-bold">Posts</h2>
        {posts.length === 0 ? (
          <p className="text-gray-500">No posts yet.</p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                writerHandle={writer.handle}
                writerName={writer.name}
                writerAvatarUrl={writer.avatarUrl}
                hideWriter
              />
            ))}
          </div>
        )}
      </section>

      {writer.whopChatChannelId &&
        (writer.chatPublic || subscribed) && (
          <section className="mt-10">
            <h2 className="mb-6 font-serif text-xl font-bold">Community Chat</h2>
            <WriterChat channelId={writer.whopChatChannelId} />
          </section>
        )}
    </div>
  );
}
