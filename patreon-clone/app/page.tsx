import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import CreatorSearch from './CreatorSearch'

const CREATORS_PER_PAGE = 12

interface HomePageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { page } = await searchParams
  const user = await getCurrentUser()

  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const skip = (currentPage - 1) * CREATORS_PER_PAGE

  const [creators, totalCount] = await Promise.all([
    prisma.creator.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: CREATORS_PER_PAGE,
    }),
    prisma.creator.count(),
  ])

  const totalPages = Math.ceil(totalCount / CREATORS_PER_PAGE)

  return (
    <main className="min-h-screen">
      <div className="py-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            Support creators you love
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Subscribe to your favorite creators and get access to exclusive content. Join a community of fans and creators.
          </p>
          {user ? (
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/signin"
              className="inline-block px-6 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition"
            >
              Get started
            </Link>
          )}
        </div>
      </div>

      <div className="py-16 px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12 text-gray-900">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <img
                src="/FindCreators.svg"
                alt="Find creators"
                width={48}
                height={48}
                className="mx-auto mb-4"
              />
              <h3 className="font-semibold mb-2 text-gray-900">Find creators</h3>
              <p className="text-gray-600 text-sm">
                Discover creators who share content you care about.
              </p>
            </div>
            <div className="text-center">
              <img
                src="/Subscribe.svg"
                alt="Subscribe"
                width={48}
                height={48}
                className="mx-auto mb-4"
              />
              <h3 className="font-semibold mb-2 text-gray-900">Subscribe</h3>
              <p className="text-gray-600 text-sm">
                Choose a tier that fits your budget and subscribe monthly.
              </p>
            </div>
            <div className="text-center">
              <img
                src="/EnjoyContent.svg"
                alt="Enjoy content"
                width={48}
                height={48}
                className="mx-auto mb-4"
              />
              <h3 className="font-semibold mb-2 text-gray-900">Enjoy content</h3>
              <p className="text-gray-600 text-sm">
                Get access to exclusive posts and support creators directly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">Find creators</h2>
          <CreatorSearch
            creators={creators}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        </div>
      </div>
    </main>
  )
}
