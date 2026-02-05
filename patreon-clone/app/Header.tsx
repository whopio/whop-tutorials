import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import LogoutButton from './LogoutButton'

export default async function Header() {
  const user = await getCurrentUser()

  let creator = null
  if (user) {
    creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { username: true },
    })
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto px-8 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-gray-900">
          Creator Platform
        </Link>

        <nav className="flex items-center gap-6">
          {user ? (
            <>
              <Link
                href="/subscriptions"
                className="text-sm text-gray-600 hover:text-green-600 transition"
              >
                Subscriptions
              </Link>
              {creator ? (
                <Link
                  href={`/creator/${creator.username}`}
                  className="text-sm text-gray-600 hover:text-green-600 transition"
                >
                  My Profile
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-green-600 transition"
                >
                  Dashboard
                </Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/signin"
              className="text-sm px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
