import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Suspense } from 'react'
import OnboardingButton from './OnboardingButton'
import OnboardingComplete from './OnboardingComplete'

export default async function CreatorDashboard() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/signin')
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
    include: {
      tiers: true,
      _count: {
        select: { subscriptions: true },
      },
    },
  })

  if (!creator) {
    redirect('/creator/register')
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <Suspense fallback={null}>
        <OnboardingComplete />
      </Suspense>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">Creator Dashboard</h1>
          <p className="text-gray-600">@{creator.username}</p>
        </div>
        <Link
          href={`/creator/${creator.username}`}
          className="text-sm text-blue-600 hover:underline"
        >
          View public profile →
        </Link>
      </div>

      {!creator.whopOnboarded && (
        <div className="p-4 mb-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium mb-1">Complete your account setup</h3>
          <p className="text-sm text-gray-600 mb-3">
            Verify your identity to start receiving payouts from your subscribers.
          </p>
          <OnboardingButton />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Subscribers</p>
          <p className="text-2xl font-bold">{creator._count.subscriptions}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Tiers</p>
          <p className="text-2xl font-bold">{creator.tiers.length}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Status</p>
          <p className="text-2xl font-bold">
            {creator.whopOnboarded ? '✓ Active' : 'Setup needed'}
          </p>
        </div>
      </div>

		  <Link
	  href="/creator/payouts"
	  className="block p-4 border rounded-lg hover:bg-gray-50 transition"
	>
	  <h3 className="font-medium">Payouts</h3>
	  <p className="text-sm text-gray-600">View balance and withdraw earnings</p>
	</Link>


      <div className="space-y-4">
        <Link
          href="/creator/tiers"
          className="block p-4 border rounded-lg hover:bg-gray-50 transition"
        >
          <h3 className="font-medium">Manage tiers</h3>
          <p className="text-sm text-gray-600">Create and edit subscription tiers</p>
        </Link>

        <Link
          href="/creator/posts"
          className="block p-4 border rounded-lg hover:bg-gray-50 transition"
        >
          <h3 className="font-medium">Create content</h3>
          <p className="text-sm text-gray-600">Post exclusive content for your subscribers</p>
        </Link>
      </div>
    </main>
  )
}
