'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TierFormProps {
  tier?: {
    id: string
    name: string
    description: string | null
    priceInCents: number
  }
  onCancel?: () => void
}

export default function TierForm({ tier, onCancel }: TierFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!tier

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setLoading(true)
    setError('')

    const formData = new FormData(form)
    const priceValue = formData.get('price') as string
    const priceInCents = Math.round(parseFloat(priceValue) * 100)

    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      priceInCents,
    }

    try {
      const url = isEditing 
        ? `/api/creator/tiers/${tier.id}` 
        : '/api/creator/tiers'
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to save tier')
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
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Tier name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          defaultValue={tier?.name || ''}
          placeholder="e.g., Basic, Premium, VIP"
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={tier?.description || ''}
          placeholder="What do subscribers get at this tier?"
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium mb-1">
          Monthly price (USD)
        </label>
        <div className="flex items-center">
          <span className="text-gray-500 mr-1">$</span>
          <input
            type="number"
            id="price"
            name="price"
            required
            min="1"
            step="0.01"
            defaultValue={tier ? (tier.priceInCents / 100).toFixed(2) : ''}
            placeholder="5.00"
            className="w-32 p-2 border rounded"
          />
          <span className="text-gray-500 ml-2">/ month</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {loading ? 'Saving...' : isEditing ? 'Update tier' : 'Create tier'}
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
