'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Creator {
  id: string
  username: string
  displayName: string
}

interface CreatorSearchProps {
  creators: Creator[]
  currentPage: number
  totalPages: number
}

export default function CreatorSearch({ creators, currentPage, totalPages }: CreatorSearchProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filteredCreators = creators.filter((creator) => {
    const searchLower = search.toLowerCase()
    return (
      creator.displayName.toLowerCase().includes(searchLower) ||
      creator.username.toLowerCase().includes(searchLower)
    )
  })

  function goToPage(page: number) {
    router.push(`/?page=${page}`)
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search by name or username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />

      {filteredCreators.length === 0 ? (
        <p className="text-center text-gray-500">
          {search ? 'No creators found.' : 'No creators yet.'}
        </p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCreators.map((creator) => (
              <Link
                key={creator.id}
                href={`/creator/${creator.username}`}
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition"
              >
                <p className="font-medium text-gray-900">{creator.displayName}</p>
                <p className="text-sm text-gray-500">@{creator.username}</p>
              </Link>
            ))}
          </div>

          {totalPages > 1 && !search && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
