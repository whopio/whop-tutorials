'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SignInContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-600 mt-2">Sign in to access your account</p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
            Authentication failed. Please try again.
          </div>
        )}

        <a
          href="/api/auth/login"
          className="flex items-center justify-center gap-2 w-full p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Sign in with Whop
        </a>

        <p className="text-center text-sm text-gray-500">
          Don't have a Whop account?{' '}
          <Link href="https://whop.com" className="text-indigo-600 hover:underline" target="_blank">
            Create one for free
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-600 mt-2">Sign in to access your account</p>
          </div>
        </div>
      </main>
    }>
      <SignInContent />
    </Suspense>
  )
}
