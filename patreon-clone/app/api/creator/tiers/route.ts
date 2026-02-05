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

export async function GET() {
  const { creator, error } = await requireCreator()
  if (error) return error

  const creatorWithTiers = await prisma.creator.findUnique({
    where: { id: creator.id },
    include: { tiers: true },
  })

  return NextResponse.json({ tiers: creatorWithTiers?.tiers || [] })
}

export async function POST(request: NextRequest) {
  const { user, creator, error: authError } = await requireCreator()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user!.id)
  if (rateLimitError) return rateLimitError

  if (!creator.whopCompanyId) {
    return NextResponse.json(
      { error: 'Creator account not set up for payments' },
      { status: 400 }
    )
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
    // Create a product (access pass) in Whop for this creator if they don't have one
    let whopProductId = creator.whopProductId

    if (!whopProductId) {
      const product = await whop.products.create({
        company_id: creator.whopCompanyId,
        title: `${creator.displayName}'s Membership`,
        visibility: 'visible',
      })
      whopProductId = product.id

      // Save the product ID to the creator
      await prisma.creator.update({
        where: { id: creator.id },
        data: { whopProductId },
      })
    }

    // Create a plan for this tier
    const priceInDollars = priceInCents / 100

    const plan = await whop.plans.create({
      company_id: creator.whopCompanyId,
      product_id: whopProductId,
      plan_type: 'renewal',
      initial_price: 0,
      renewal_price: priceInDollars,
      billing_period: 30,
    } as Parameters<typeof whop.plans.create>[0])

    // Save the tier to your database
    const tier = await prisma.tier.create({
      data: {
        creatorId: creator.id,
        name,
        description: description || null,
        priceInCents,
        whopPlanId: plan.id,
      },
    })

    return NextResponse.json({ tier })
  } catch (error) {
    console.error('Tier creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create tier' },
      { status: 500 }
    )
  }
}
