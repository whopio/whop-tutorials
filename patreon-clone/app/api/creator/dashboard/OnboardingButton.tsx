'use client'

import { useState } from 'react'

export default function OnboardingButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)

    try {
      const response = await fetch('/api/creator/onboarding', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.url) {
        // Redirect to Whop's hosted onboarding
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Failed to start onboarding:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50 transition"
    >
      {loading ? 'Loading...' : 'Complete verification'}
    </button>
  )
}