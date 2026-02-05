import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import PayoutButton from './PayoutButton'

interface PayoutsPageProps {
  searchParams: Promise<{ returned?: string }>
}

export default async function PayoutsPage({ searchParams }: PayoutsPageProps) {
  const { returned } = await searchParams
  const user = await getCurrentUser()

  if (!user) {
    redirect('/signin')
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
  })

  if (!creator) {
    redirect('/creator/register')
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Payouts</h1>
          <p className="text-gray-600">Manage your earnings and withdrawals</p>
        </div>
        <Link
          href="/creator/dashboard"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>

      {returned === 'true' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">
            Payout settings updated successfully.
          </p>
        </div>
      )}

      {!creator.whopOnboarded ? (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h2 className="font-medium mb-2">Complete account setup first</h2>
          <p className="text-sm text-gray-600 mb-4">
            You need to complete your creator onboarding before you can access payouts.
          </p>
          <Link
            href="/creator/dashboard"
            className="inline-block px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
          >
            Go to dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-6 border rounded-lg">
            <h2 className="text-lg font-medium mb-2">Payout Portal</h2>
            <p className="text-gray-600 mb-4">
              Access Whop's payout portal to view your balance, complete identity verification, add payout methods, and withdraw your earnings.
            </p>
            <PayoutButton />
          </div>

          <div className="p-6 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">How payouts work</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Subscriber payments go to your Whop company balance</li>
              <li>• Complete identity verification (KYC) to enable withdrawals</li>
              <li>• Add a bank account or other payout method</li>
              <li>• Withdraw funds manually or set up automatic payouts</li>
            </ul>
          </div>
        </div>
      )}
    </main>
  )
}
