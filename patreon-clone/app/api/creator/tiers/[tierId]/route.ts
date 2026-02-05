import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCreator } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { prisma } from '@/lib/prisma'
import { whop } from '@/lib/whop'

const tierSchema = z.object({
  name: z
    .string()
    .min(1, 'Tier name is required')
    .max(50, 'Tier name must be 50 characters or less'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  priceInCents: z
    .number()
    .int('Price must be a whole number')
    .min(100, 'Price must be at least $1.00'),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tierId: string }> }
) {
  const { user, creator, error: authError } = await requireCreator()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user!.id)
  if (rateLimitError) return rateLimitError

  const { tierId } = await params

  const tier = await prisma.tier.findUnique({
    where: { id: tierId },
  })

  if (!tier || tier.creatorId !== creator.id) {
    return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = tierSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { name, description, priceInCents } = parsed.data

  try {
    // Update the plan in Whop
    if (tier.whopPlanId) {
      const priceInDollars = priceInCents / 100
      await whop.plans.update(tier.whopPlanId, {
        initial_price: priceInDollars,
        renewal_price: priceInDollars,
        internal_notes: `Tier: ${name}`,
      })
    }

    // Update the tier in your database
    const updatedTier = await prisma.tier.update({
      where: { id: tierId },
      data: {
        name,
        description: description || null,
        priceInCents,
      },
    })

    return NextResponse.json({ tier: updatedTier })
  } catch (error) {
    console.error('Tier update error:', error)
    return NextResponse.json(
      { error: 'Failed to update tier' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tierId: string }> }
) {
  const { user, creator, error: authError } = await requireCreator()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user!.id)
  if (rateLimitError) return rateLimitError

  const { tierId } = await params

  const tier = await prisma.tier.findUnique({
    where: { id: tierId },
  })

  if (!tier || tier.creatorId !== creator.id) {
    return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
  }

  try {
    // Delete the plan from Whop
    if (tier.whopPlanId) {
      await whop.plans.delete(tier.whopPlanId)
    }

    // Delete the tier from your database
    await prisma.tier.delete({
      where: { id: tierId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tier deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete tier' },
      { status: 500 }
    )
  }
}
