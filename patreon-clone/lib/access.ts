import { Tier } from '@prisma/client'

interface AccessCheckParams {
  postMinimumTierId: string | null
  userTierId: string | null
  allTiers: Tier[]
}

export function canAccessPost({
  postMinimumTierId,
  userTierId,
  allTiers,
}: AccessCheckParams): boolean {
  // Public posts (no minimum tier) are accessible to everyone
  if (!postMinimumTierId) {
    return true
  }

  // No subscription means no access to gated content
  if (!userTierId) {
    return false
  }

  // Sort tiers by price to determine hierarchy
  const sortedTiers = [...allTiers].sort((a, b) => a.priceInCents - b.priceInCents)
  
  const userTierIndex = sortedTiers.findIndex(t => t.id === userTierId)
  const postTierIndex = sortedTiers.findIndex(t => t.id === postMinimumTierId)

  // User can access if their tier is equal or higher than the post's minimum
  return userTierIndex >= postTierIndex
}
