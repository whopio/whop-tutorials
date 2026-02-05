import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { canAccessPost } from '@/lib/access'
import Link from 'next/link'

interface ProfilePageProps {
  params: Promise<{ username: string }>
  searchParams: Promise<{ subscribed?: string; already_subscribed?: string }>
}

export default async function CreatorProfilePage({
  params,
  searchParams,
}: ProfilePageProps) {
  const { username } = await params
  const { subscribed, already_subscribed } = await searchParams
  const user = await getCurrentUser()

  const creator = await prisma.creator.findUnique({
    where: { username },
    include: {
      tiers: {
        orderBy: { priceInCents: 'asc' },
      },
      posts: {
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        include: { minimumTier: true },
      },
      _count: {
        select: { subscriptions: true },
      },
    },
  })

  if (!creator) {
    notFound()
  }

  // Check if the current user has a subscription
  let userSubscription = null
  if (user) {
    userSubscription = await prisma.subscription.findUnique({
      where: {
        userId_creatorId: {
          userId: user.id,
          creatorId: creator.id,
        },
      },
      include: { tier: true },
    })
  }

  const isActiveSubscriber = userSubscription?.status === 'ACTIVE'

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      {subscribed === 'true' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            Thanks for subscribing! Your subscription is being processed.
          </p>
          <p className="text-green-700 text-sm mt-1">
            You'll have access to exclusive content once the payment is confirmed.
          </p>
        </div>
      )}

      {already_subscribed === 'true' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">
            You're already subscribed to this creator!
          </p>
        </div>
      )}

      {/* Creator info */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{creator.displayName}</h1>
        <p className="text-gray-600">@{creator.username}</p>
        {creator.bio && (
          <p className="mt-4 text-gray-700">{creator.bio}</p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          {creator._count.subscriptions} subscriber{creator._count.subscriptions !== 1 ? 's' : ''}
        </p>
        {isActiveSubscriber && userSubscription && (
          <p className="mt-2 text-sm text-green-600 font-medium">
            ✓ Subscribed to {userSubscription.tier.name}
          </p>
        )}
      </div>

      {/* Posts section */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4">Posts</h2>
        {creator.posts.length === 0 ? (
          <p className="text-gray-500">No posts yet.</p>
        ) : (
          <div className="space-y-4">
            {creator.posts.map((post) => {
              const hasAccess = canAccessPost({
                postMinimumTierId: post.minimumTierId,
                userTierId: isActiveSubscriber && userSubscription ? userSubscription.tierId : null,
                allTiers: creator.tiers,
              })

              return (
                <div
                  key={post.id}
                  className="p-6 border rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium">{post.title}</h3>
                    {post.minimumTier && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {post.minimumTier.name}
                      </span>
                    )}
                  </div>
                  
                  {hasAccess ? (
                    <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                  ) : (
                    <div className="relative">
                      <p className="text-gray-400 blur-sm select-none">
                        {post.content.substring(0, 150)}...
                      </p>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-gray-600 font-medium">
                            🔒 Subscribe to unlock
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {post.minimumTier?.name} tier or higher
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-400 mt-4">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Subscription tiers */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          {isActiveSubscriber ? 'Subscription Tiers' : 'Subscribe'}
        </h2>
        {creator.tiers.length === 0 ? (
          <p className="text-gray-500">No subscription tiers available yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {creator.tiers.map((tier) => {
              const isCurrentTier = userSubscription?.tierId === tier.id

              return (
                <div
                  key={tier.id}
                  className={`p-6 border rounded-lg flex flex-col justify-between ${
                    isCurrentTier ? 'border-green-500 bg-green-50' : ''
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium">{tier.name}</h3>
                      {isCurrentTier && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    {tier.description && (
                      <p className="text-sm text-gray-600 mt-1">{tier.description}</p>
                    )}
                    <p className="text-2xl font-bold mt-4">
                      ${(tier.priceInCents / 100).toFixed(2)}
                      <span className="text-sm font-normal text-gray-500">/month</span>
                    </p>
                  </div>
                  {!isActiveSubscriber && (
                    <Link
                      href={`/subscribe/${creator.username}/${tier.id}`}
                      className="mt-4 block text-center px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
                    >
                      Subscribe
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
