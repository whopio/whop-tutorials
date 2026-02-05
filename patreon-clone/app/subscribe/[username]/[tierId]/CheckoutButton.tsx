'use client'

import { useState } from 'react'

interface CheckoutButtonProps {
  creatorId: string
  tierId: string
  creatorUsername: string
}

export default function CheckoutButton({
  creatorId,
  tierId,
  creatorUsername,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckout() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId, tierId, creatorUsername }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create checkout')
        return
      }

      // Redirect to Whop's hosted checkout
      window.location.href = data.checkoutUrl
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="p-3 mb-4 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          {error}
        </div>
      )}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full p-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition font-medium"
      >
        {loading ? 'Loading...' : 'Continue to checkout'}
      </button>
    </div>
  )
}
