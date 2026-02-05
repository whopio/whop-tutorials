import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCreator } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { prisma } from '@/lib/prisma'

const postSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be 10,000 characters or less'),
  minimumTierId: z
    .string()
    .min(1, 'You must select a minimum tier for this post'),
  published: z.boolean().optional(),
})

export async function GET() {
  const { creator, error } = await requireCreator()
  if (error) return error

  const creatorWithPosts = await prisma.creator.findUnique({
    where: { id: creator.id },
    include: {
      posts: {
        orderBy: { createdAt: 'desc' },
        include: { minimumTier: true },
      },
    },
  })

  return NextResponse.json({ posts: creatorWithPosts?.posts || [] })
}

export async function POST(request: NextRequest) {
  const { user, creator, error: authError } = await requireCreator()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user!.id)
  if (rateLimitError) return rateLimitError

  const creatorWithTiers = await prisma.creator.findUnique({
    where: { id: creator.id },
    include: { tiers: true },
  })

  const body = await request.json()
  const parsed = postSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { title, content, minimumTierId, published } = parsed.data

  // Verify the tier belongs to this creator
  const tierExists = creatorWithTiers?.tiers.some((t) => t.id === minimumTierId)
  if (!tierExists) {
    return NextResponse.json(
      { error: 'Invalid tier selected' },
      { status: 400 }
    )
  }

  try {
    const post = await prisma.post.create({
      data: {
        creatorId: creator.id,
        title,
        content,
        minimumTierId,
        published: published || false,
      },
    })

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Post creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
