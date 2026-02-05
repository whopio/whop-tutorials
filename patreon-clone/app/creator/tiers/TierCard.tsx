'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TierForm from './TierForm'

interface TierCardProps {
  tier: {
    id: string
    name: string
    description: string | null
    priceInCents: number
  }
}

export default function TierCard({ tier }: TierCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this tier?')) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/creator/tiers/${tier.id}`, {
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
    return <TierForm tier={tier} onCancel={() => setIsEditing(false)} />
  }

  return (
    <div className="p-4 border rounded-lg flex justify-between items-start">
      <div>
        <h3 className="font-medium">{tier.name}</h3>
        {tier.description && (
          <p className="text-sm text-gray-600 mt-1">{tier.description}</p>
        )}
        <p className="text-lg font-bold mt-2">
          ${(tier.priceInCents / 100).toFixed(2)}/month
        </p>
      </div>
      <div className="flex gap-2">
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
  )
}
