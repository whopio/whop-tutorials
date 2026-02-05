'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CancelButtonProps {
  subscriptionId: string
}

export default function CancelButton({ subscriptionId }: CancelButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleCancel() {
    setLoading(true)

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to cancel subscription')
        return
      }

      router.refresh()
    } catch (error) {
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Cancel subscription?</span>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          {loading ? 'Canceling...' : 'Yes, cancel'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={loading}
          className="text-sm text-gray-600 hover:underline"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="text-sm text-red-600 hover:underline"
    >
      Cancel
    </button>
  )
}
