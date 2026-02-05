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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { user, creator, error: authError } = await requireCreator()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user!.id)
  if (rateLimitError) return rateLimitError

  const { postId } = await params

  const creatorWithTiers = await prisma.creator.findUnique({
    where: { id: creator.id },
    include: { tiers: true },
  })

  const post = await prisma.post.findUnique({
    where: { id: postId },
  })

  if (!post || post.creatorId !== creator.id) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

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
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title,
        content,
        minimumTierId,
        published,
      },
    })

    return NextResponse.json({ post: updatedPost })
  } catch (error) {
    console.error('Post update error:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { user, creator, error: authError } = await requireCreator()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user!.id)
  if (rateLimitError) return rateLimitError

  const { postId } = await params

  const post = await prisma.post.findUnique({
    where: { id: postId },
  })

  if (!post || post.creatorId !== creator.id) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  try {
    await prisma.post.delete({
      where: { id: postId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Post deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}
