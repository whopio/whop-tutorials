'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatorRegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const data = {
      username: formData.get('username'),
      displayName: formData.get('displayName'),
      bio: formData.get('bio'),
    }

    try {
      const response = await fetch('/api/creator/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Registration failed')
        return
      }

      // Redirect to creator dashboard
      router.push('/creator/dashboard')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Become a Creator</h1>
      <p className="text-gray-600 mb-8">
        Set up your creator profile to start accepting subscriptions.
      </p>

      {error && (
        <div className="p-3 mb-6 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Username
          </label>
          <div className="flex items-center">
            <span className="text-gray-500 mr-1">@</span>
            <input
              type="text"
              id="username"
              name="username"
              required
              pattern="[a-z0-9_]+"
              placeholder="yourname"
              className="flex-1 p-2 border rounded"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Lowercase letters, numbers, and underscores only
          </p>
        </div>

        <div>
          <label htmlFor="displayName" className="block text-sm font-medium mb-1">
            Display name
          </label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            required
            placeholder="Your Name"
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-1">
            Bio (optional)
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            placeholder="Tell subscribers about yourself..."
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {loading ? 'Creating...' : 'Create creator account'}
        </button>
      </form>
    </main>
  )
}