import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function Dashboard() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/signin')
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
  })

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome back, {user.name || user.email}</p>

      <div className="space-y-4">
        {creator ? (
          <Link
            href="/creator/dashboard"
            className="block p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <h3 className="font-medium">Creator Dashboard</h3>
            <p className="text-sm text-gray-600">Manage your tiers and content</p>
          </Link>
        ) : (
          <Link
            href="/creator/register"
            className="block p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <h3 className="font-medium">Become a Creator</h3>
            <p className="text-sm text-gray-600">Start accepting subscriptions from your fans</p>
          </Link>
        )}

        <Link
          href="/subscriptions"
          className="block p-4 border rounded-lg hover:bg-gray-50 transition"
        >
          <h3 className="font-medium">My Subscriptions</h3>
          <p className="text-sm text-gray-600">Manage creators you're subscribed to</p>
        </Link>
      </div>
    </main>
  )
}
