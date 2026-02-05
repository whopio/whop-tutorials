import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { prisma } from '@/lib/prisma'
import { whop } from '@/lib/whop'

const checkoutSchema = z.object({
  creatorId: z.string().min(1, 'Creator ID is required'),
  tierId: z.string().min(1, 'Tier ID is required'),
  creatorUsername: z.string().min(1, 'Creator username is required'),
})

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user.id)
  if (rateLimitError) return rateLimitError

  const body = await request.json()
  const parsed = checkoutSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { creatorId, tierId, creatorUsername } = parsed.data

  // Get the creator and tier
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    include: { tiers: true },
  })

  if (!creator || !creator.whopCompanyId) {
    return NextResponse.json(
      { error: 'Creator not found or not set up for payments' },
      { status: 404 }
    )
  }

  const tier = creator.tiers.find((t) => t.id === tierId)

  if (!tier) {
    return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
  }

  if (!tier.whopPlanId) {
    return NextResponse.json(
      { error: 'Tier not properly configured for payments' },
      { status: 400 }
    )
  }

  // Check if user is already subscribed
  const existingSubscription = await prisma.subscription.findUnique({
    where: {
      userId_creatorId: {
        userId: user.id,
        creatorId: creator.id,
      },
    },
  })

  if (existingSubscription) {
    return NextResponse.json(
      { error: 'You are already subscribed to this creator' },
      { status: 400 }
    )
  }

  try {
    // Use the existing plan that was created when the tier was set up
    const baseUrl = process.env.AUTH_URL || 'http://localhost:3000'
    const redirectUrl = baseUrl.startsWith('https://')
      ? `${baseUrl}/creator/${creatorUsername}?subscribed=true`
      : undefined // Whop requires https for redirect URLs

    const checkoutConfig = await whop.checkoutConfigurations.create({
      plan_id: tier.whopPlanId,
      ...(redirectUrl && { redirect_url: redirectUrl }),
      metadata: {
        platform_user_id: user.id,
        platform_creator_id: creator.id,
        platform_tier_id: tier.id,
      },
    })

    return NextResponse.json({ checkoutUrl: checkoutConfig.purchase_url })
  } catch (error) {
    console.error('Checkout creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    )
  }
}
