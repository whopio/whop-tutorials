import { NextRequest, NextResponse } from 'next/server'
import { unwrapWebhook } from '@whop/sdk/helpers'
import { prisma } from '@/lib/prisma'

type PlatformMetadata = {
  platform_user_id?: string
  platform_creator_id?: string
  platform_tier_id?: string
}

type WebhookData = {
  id?: string
  membership?: { id?: string } | null
  membership_id?: string | null
  user?: { id?: string } | null
  user_id?: string | null
  plan?: { id?: string } | null
  plan_id?: string | null
  cancel_at_period_end?: boolean
  checkout_configuration?: { metadata?: PlatformMetadata } | null
  metadata?: PlatformMetadata | null
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const headers = Object.fromEntries(request.headers)

  try {
    const webhook = unwrapWebhook<{ type: string; data: WebhookData }>(rawBody, {
      headers,
      key: process.env.WHOP_WEBHOOK_SECRET,
    })

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

  // Depending on the webhook's API version, Whop sends nested objects (membership.id)
  // or flat IDs (membership_id), so we read both.
  const whopMembershipId = data.membership_id ?? data.membership?.id ?? null

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

async function handleMembershipActivated(data: WebhookData) {
  const whopMembershipId = data.id
  const whopUserId = data.user_id ?? data.user?.id
  const whopPlanId = data.plan_id ?? data.plan?.id

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
      userId_creatorId: {
        userId: user.id,
        creatorId: tier.creatorId,
      },
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
    data: {
      status: data.cancel_at_period_end ? 'CANCELING' : 'ACTIVE',
    },
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
