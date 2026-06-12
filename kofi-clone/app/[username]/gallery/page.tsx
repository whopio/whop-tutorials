/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CreatorProfileHeader from "@/components/creator/CreatorProfileHeader";

export default async function GalleryPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const creator = await prisma.creator.findUnique({
    where: { username },
    select: { id: true, isActive: true },
  });
  if (!creator || !creator.isActive) notFound();

  const posts = await prisma.post.findMany({
    where: { creatorId: creator.id, published: true, imageUrl: { not: null } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, imageUrl: true },
  });

  return (
    <>
      <CreatorProfileHeader username={username} />

      <div className="mx-auto max-w-5xl px-5 py-6">
        <h1 className="text-xl font-bold">Gallery</h1>

        <div className="mt-5">
          {posts.length === 0 ? (
            <div className="kofi-card p-8 text-center">
              <p className="text-sm text-muted">No images yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/${username}/post/${post.id}`}
                  className="kofi-card group block aspect-square overflow-hidden"
                >
                  <img
                    src={post.imageUrl as string}
                    alt={post.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
