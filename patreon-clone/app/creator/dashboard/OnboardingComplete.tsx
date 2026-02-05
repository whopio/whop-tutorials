'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function OnboardingComplete() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'completing' | 'done' | 'error'>('idle')

  useEffect(() => {
    const onboardingParam = searchParams.get('onboarding')

    if (onboardingParam === 'complete' && status === 'idle') {
      setStatus('completing')

      fetch('/api/creator/onboarding/complete', {
        method: 'POST',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStatus('done')
            // Remove the query parameter and refresh to show updated state
            router.replace('/creator/dashboard')
            router.refresh()
          } else {
            setStatus('error')
          }
        })
        .catch(() => {
          setStatus('error')
        })
    }
  }, [searchParams, router, status])

  if (status === 'completing') {
    return (
      <div className="p-4 mb-6 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">Completing your account setup...</p>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="p-4 mb-6 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800">Account setup complete! You can now receive payouts.</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">Failed to complete setup. Please try again.</p>
      </div>
    )
  }

  return null
}
