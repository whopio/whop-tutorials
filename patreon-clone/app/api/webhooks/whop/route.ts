import { NextRequest, NextResponse } from 'next/server'
import { whop } from '@/lib/whop'
import { prisma } from '@/lib/prisma'

type PlatformMetadata = {
  platform_user_id?: string
  platform_creator_id?: string
  platform_tier_id?: string
}

type WebhookData = {
  id?: string
  membership?: { id?: string } | null
  user?: { id?: string } | null
  plan?: { id?: string } | null
  cancel_at_period_end?: boolean
  checkout_configuration?: { metadata?: PlatformMetadata } | null
  metadata?: PlatformMetadata | null
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const headers = Object.fromEntries(request.headers)

  try {
    const webhook = whop.webhooks.unwrap(rawBody, { headers }) as unknown as {
      type: string
      data: WebhookData
    }

    switch (webhook.type) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(webhook.data)
        break
      case 'membership.activated':
        await handleMembershipActivated(webhook.data)
        break
      case 'membership.cancel_at_period_end_changed':
        await handleCancelAtPeriodEndChanged(webhook.data)
        break
      case 'membership.deactivated':
        await handleMembershipDeactivated(webhook.data)
        break
      default:
        // Ignore events we don't handle
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 }
    )
  }
}

function getPlatformMetadata(data: WebhookData): PlatformMetadata {
  return data.checkout_configuration?.metadata ?? data.metadata ?? {}
}

async function handlePaymentSucceeded(data: WebhookData) {
  const metadata = getPlatformMetadata(data)
  const userId = metadata.platform_user_id
  const creatorId = metadata.platform_creator_id
  const tierId = metadata.platform_tier_id

  // On payment.succeeded the membership id is on data.membership.id.
  // It is NOT data.id (that is the payment id, pay_...). Never fall back to it.
  const whopMembershipId = data.membership?.id ?? null

  if (!userId || !creatorId || !tierId) {
    console.error('Missing platform metadata in payment.succeeded:', { metadata })
    return
  }

  const existing = await prisma.subscription.findFirst({
    where: { userId, creatorId },
    select: { id: true },
  })

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: 'ACTIVE', whopMembershipId },
    })
    return
  }

  await prisma.subscription.create({
    data: {
      userId,
      creatorId,
      tierId,
      whopMembershipId,
      status: 'ACTIVE',
    },
  })
}

// membership.activated always carries the membership id (data.id = mem_...).
// Use it to backfill/correct whopMembershipId by matching the Whop user + plan,
// which we already store. This keeps cancellation lookups reliable.
async function handleMembershipActivated(data: WebhookData) {
  const whopMembershipId = data.id
  const whopUserId = data.user?.id
  const whopPlanId = data.plan?.id

  if (!whopMembershipId || !whopUserId || !whopPlanId) {
    return
  }

  const user = await prisma.user.findUnique({
    where: { whopUserId },
    select: { id: true },
  })
  const tier = await prisma.tier.findUnique({
    where: { whopPlanId },
    select: { creatorId: true },
  })

  if (!user || !tier) {
    return
  }

  const subscription = await prisma.subscription.findUnique({
    where: {
      userId_creatorId: { userId: user.id, creatorId: tier.creatorId },
    },
    select: { id: true },
  })

  if (!subscription) {
    return
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'ACTIVE', whopMembershipId },
  })
}

async function handleCancelAtPeriodEndChanged(data: WebhookData) {
  const whopMembershipId = data.id

  if (!whopMembershipId) {
    console.error('Missing membership ID in membership.cancel_at_period_end_changed')
    return
  }

  const subscription = await prisma.subscription.findUnique({
    where: { whopMembershipId },
    select: { id: true },
  })

  if (!subscription) {
    console.error('Subscription not found for membership:', whopMembershipId)
    return
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: data.cancel_at_period_end ? 'CANCELING' : 'ACTIVE' },
  })
}

async function handleMembershipDeactivated(data: WebhookData) {
  const whopMembershipId = data.id

  if (!whopMembershipId) {
    console.error('Missing membership ID in membership.deactivated')
    return
  }

  const subscription = await prisma.subscription.findUnique({
    where: { whopMembershipId },
    select: { id: true },
  })

  if (!subscription) {
    console.error('Subscription not found for membership:', whopMembershipId)
    return
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'CANCELED' },
  })
}
