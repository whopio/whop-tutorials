'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PostForm from './PostForm'

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
  minimumTier: Tier | null
  createdAt: Date | string
}

interface PostCardProps {
  post: Post
  tiers: Tier[]
}

export default function PostCard({ post, tiers }: PostCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this post?')) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/creator/posts/${post.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isEditing) {
    return (
      <PostForm
        tiers={tiers}
        post={post}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium">{post.title}</h3>
            {!post.published && (
              <span className="px-2 py-0.5 text-xs bg-gray-200 rounded">
                Draft
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {post.minimumTier && (
              <span>
                Requires: {post.minimumTier.name} ($
                {(post.minimumTier.priceInCents / 100).toFixed(2)}/mo)
              </span>
            )}
            <span>
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 transition"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 transition"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
