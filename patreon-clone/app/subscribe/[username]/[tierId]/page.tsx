import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import CheckoutButton from './CheckoutButton'

interface SubscribePageProps {
  params: Promise<{ username: string; tierId: string }>
}

export default async function SubscribePage({ params }: SubscribePageProps) {
  const { username, tierId } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/signin?redirect=/subscribe/${username}/${tierId}`)
  }

  const creator = await prisma.creator.findUnique({
    where: { username },
    include: {
      tiers: {
        orderBy: { priceInCents: 'asc' },
      },
      _count: {
        select: { subscriptions: true },
      },
    },
  })

  if (!creator) {
    notFound()
  }

  const tier = creator.tiers.find((t) => t.id === tierId)

  if (!tier) {
    notFound()
  }

  // Check if user is already subscribed to this creator
  const existingSubscription = await prisma.subscription.findUnique({
    where: {
      userId_creatorId: {
        userId: user.id,
        creatorId: creator.id,
      },
    },
  })

  if (existingSubscription) {
    redirect(`/creator/${username}?already_subscribed=true`)
  }

  // Count posts available at this tier level
  const tierIndex = creator.tiers.findIndex((t) => t.id === tierId)
  const accessibleTierIds = creator.tiers
    .slice(0, tierIndex + 1)
    .map((t) => t.id)

  const postCount = await prisma.post.count({
    where: {
      creatorId: creator.id,
      published: true,
      minimumTierId: { in: accessibleTierIds },
    },
  })

  return (
    <main className="min-h-screen p-8 max-w-xl mx-auto">
      <Link
        href={`/creator/${username}`}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to {creator.displayName}'s profile
      </Link>

      <div className="mt-6 p-6 border rounded-lg">
        <h1 className="text-2xl font-bold mb-1">Subscribe to {creator.displayName}</h1>
        <p className="text-gray-600 mb-6">@{creator.username}</p>

        <div className="p-4 bg-gray-50 rounded-lg mb-6">
          <h2 className="font-medium text-lg">{tier.name}</h2>
          {tier.description && (
            <p className="text-sm text-gray-600 mt-1">{tier.description}</p>
          )}
          <p className="text-3xl font-bold mt-4">
            ${(tier.priceInCents / 100).toFixed(2)}
            <span className="text-base font-normal text-gray-500">/month</span>
          </p>
        </div>

        <div className="mb-6 text-sm text-gray-600">
          <p>✓ Access to {postCount} post{postCount !== 1 ? 's' : ''}</p>
          <p>✓ Support {creator.displayName} directly</p>
          <p>✓ Cancel anytime</p>
        </div>

        <CheckoutButton
          creatorId={creator.id}
          tierId={tier.id}
          creatorUsername={creator.username}
        />

        <p className="text-xs text-gray-500 mt-4 text-center">
          Payments are securely processed by Whop
        </p>
      </div>
    </main>
  )
}
