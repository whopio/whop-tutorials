'use client'

import { useState } from 'react'

export default function PayoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)

    try {
      const response = await fetch('/api/creator/payouts', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to get payout portal link')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to open payout portal. Please try again.')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition disabled:opacity-50"
    >
      {loading ? 'Opening...' : 'Open Payout Portal'}
    </button>
  )
}
