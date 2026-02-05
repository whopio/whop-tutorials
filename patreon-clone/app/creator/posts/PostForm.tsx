'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Tier {
  id: string
  name: string
  priceInCents: number
}

interface Post {
  id: string
  title: string
  content: string
  published: boolean
  minimumTierId: string | null
}

interface PostFormProps {
  tiers: Tier[]
  post?: Post
  onCancel?: () => void
}

export default function PostForm({ tiers, post, onCancel }: PostFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!post

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setLoading(true)
    setError('')

    const formData = new FormData(form)
    const data = {
      title: formData.get('title'),
      content: formData.get('content'),
      minimumTierId: formData.get('minimumTierId'),
      published: formData.get('published') === 'on',
    }

    try {
      const url = isEditing
        ? `/api/creator/posts/${post.id}`
        : '/api/creator/posts'

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to save post')
        return
      }

      if (isEditing && onCancel) {
        onCancel()
      } else {
        form.reset()
      }

      router.refresh()
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg space-y-4">
      {error && (
        <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          defaultValue={post?.title || ''}
          placeholder="Post title"
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium mb-1">
          Content
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={6}
          defaultValue={post?.content || ''}
          placeholder="Write your post content here..."
          className="w-full p-2 border rounded"
        />
        <p className="text-xs text-gray-500 mt-1">
          Plain text only. Image and video uploads can be added as a future enhancement.
        </p>
      </div>

      <div>
        <label htmlFor="minimumTierId" className="block text-sm font-medium mb-1">
          Minimum tier required
        </label>
        <select
          id="minimumTierId"
          name="minimumTierId"
          required
          defaultValue={post?.minimumTierId || ''}
          className="w-full p-2 border rounded"
        >
          <option value="">Select a tier</option>
          {tiers.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.name} (${(tier.priceInCents / 100).toFixed(2)}/month)
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Subscribers at this tier or higher can view this post. Content gating is covered in Step 10.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="published"
          name="published"
          defaultChecked={post?.published || false}
          className="rounded"
        />
        <label htmlFor="published" className="text-sm">
          Publish immediately (uncheck to save as draft)
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {loading ? 'Saving...' : isEditing ? 'Update post' : 'Create post'}
        </button>
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
