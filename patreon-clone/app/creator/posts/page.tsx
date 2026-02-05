import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import PostForm from './PostForm'
import PostCard from './PostCard'

export default async function PostsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/signin')
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
    include: {
      tiers: { orderBy: { priceInCents: 'asc' } },
      posts: {
        orderBy: { createdAt: 'desc' },
        include: { minimumTier: true },
      },
    },
  })

  if (!creator) {
    redirect('/creator/register')
  }

  if (creator.tiers.length === 0) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Create Content</h1>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-gray-700">
            You need to create at least one subscription tier before you can create posts.
          </p>
          <Link
            href="/creator/tiers"
            className="inline-block mt-3 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
          >
            Create a tier
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Your Posts</h1>
          <p className="text-gray-600">Create and manage content for your subscribers</p>
        </div>
        <Link
          href="/creator/dashboard"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4">Create a new post</h2>
        <PostForm tiers={creator.tiers} />
      </div>

      <div>
        <h2 className="text-lg font-medium mb-4">
          Your posts ({creator.posts.length})
        </h2>
        {creator.posts.length === 0 ? (
          <p className="text-gray-500">No posts yet. Create your first one above.</p>
        ) : (
          <div className="space-y-4">
            {creator.posts.map((post) => (
              <PostCard key={post.id} post={post} tiers={creator.tiers} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
