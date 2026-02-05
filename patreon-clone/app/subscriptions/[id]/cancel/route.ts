import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { whop } from '@/lib/whop'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params

  const subscription = await prisma.subscription.findUnique({
    where: { id },
  })

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  if (subscription.userId !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  if (subscription.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Subscription is not active' },
      { status: 400 }
    )
  }

  if (!subscription.whopMembershipId) {
    return NextResponse.json(
      { error: 'Subscription is not linked to Whop' },
      { status: 400 }
    )
  }

  try {
    await whop.memberships.cancel(subscription.whopMembershipId, {
      cancellation_mode: 'at_period_end',
    })

    await prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELING' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
