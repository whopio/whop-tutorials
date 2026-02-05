import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import CancelButton from './CancelButton'

export default async function SubscriptionsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/signin')
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId: user.id,
      status: { in: ['ACTIVE', 'CANCELING'] },
    },
    include: {
      creator: true,
      tier: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Subscriptions</h1>
          <p className="text-gray-600">Manage your active subscriptions</p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">You don't have any active subscriptions.</p>
          <Link
            href="/"
            className="text-blue-600 hover:underline"
          >
            Discover creators to subscribe to
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="p-6 border rounded-lg"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-lg">
                    {subscription.creator.displayName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    @{subscription.creator.username}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    ${(subscription.tier.priceInCents / 100).toFixed(2)}/month
                  </p>
                  <p className="text-sm text-gray-500">
                    {subscription.tier.name}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {subscription.status === 'ACTIVE' && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Active
                    </span>
                  )}
                  {subscription.status === 'CANCELING' && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                      Cancels at period end
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    Subscribed {new Date(subscription.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/creator/${subscription.creator.username}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View profile
                  </Link>
                  {subscription.status === 'ACTIVE' && (
                    <CancelButton subscriptionId={subscription.id} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
