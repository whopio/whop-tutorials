import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import TierForm from './TierForm'
import TierCard from './TierCard'

export default async function TiersPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/signin')
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
    include: { tiers: { orderBy: { priceInCents: 'asc' } } },
  })

  if (!creator) {
    redirect('/creator/register')
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Subscription Tiers</h1>
          <p className="text-gray-600">Create and manage your subscription options</p>
        </div>
        <Link
          href="/creator/dashboard"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4">Create a new tier</h2>
        <TierForm />
      </div>

      <div>
        <h2 className="text-lg font-medium mb-4">Your tiers</h2>
        {creator.tiers.length === 0 ? (
          <p className="text-gray-500">No tiers yet. Create your first one above.</p>
        ) : (
          <div className="space-y-4">
            {creator.tiers.map((tier) => (
              <TierCard key={tier.id} tier={tier} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
