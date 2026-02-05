import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { prisma } from '@/lib/prisma'
import { whop } from '@/lib/whop'

const registerSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(30, 'Username must be 30 characters or less')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be 50 characters or less'),
  bio: z
    .string()
    .max(500, 'Bio must be 500 characters or less')
    .optional(),
})

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user.id)
  if (rateLimitError) return rateLimitError

  // Check if user is already a creator
  const existingCreator = await prisma.creator.findUnique({
    where: { userId: user.id },
  })

  if (existingCreator) {
    return NextResponse.json(
      { error: 'You are already registered as a creator' },
      { status: 400 }
    )
  }

  const body = await request.json()
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { username, displayName, bio } = parsed.data

  // Check if username is taken
  const usernameTaken = await prisma.creator.findUnique({
    where: { username },
  })

  if (usernameTaken) {
    return NextResponse.json(
      { error: 'Username is already taken' },
      { status: 400 }
    )
  }

  try {
    // Create a Whop connected account for the creator
    const whopCompany = await whop.companies.create({
      email: user.email,
      parent_company_id: process.env.WHOP_COMPANY_ID!,
      title: displayName,
      metadata: {
        platform_user_id: user.id,
        platform_username: username,
      },
    })

    // Save creator to database
    const creator = await prisma.creator.create({
      data: {
        userId: user.id,
        username,
        displayName,
        bio: bio || null,
        whopCompanyId: whopCompany.id,
      },
    })

    return NextResponse.json({ creator })
  } catch (error) {
    console.error('Creator registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register as creator' },
      { status: 500 }
    )
  }
}
