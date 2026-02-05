import { NextRequest, NextResponse } from 'next/server'
import { whop } from '@/lib/whop'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const headers = Object.fromEntries(request.headers)

  try {
    const webhookData = whop.webhooks.unwrap(rawBody, { headers })
    const { type, data } = webhookData as any

    if (type === 'payment.succeeded') {
      await handlePaymentSucceeded(data)
    } else if (type === 'membership.cancel_at_period_end_changed') {
      await handleCancelAtPeriodEndChanged(data)
    } else if (type === 'membership.deactivated') {
      await handleMembershipDeactivated(data)
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

async function handlePaymentSucceeded(data: any) {
  const metadata = data.checkout_configuration?.metadata || data.metadata

  const platformUserId = metadata?.platform_user_id
  const platformCreatorId = metadata?.platform_creator_id
  const platformTierId = metadata?.platform_tier_id
  const membershipId = data.membership?.id || data.id

  if (!platformUserId || !platformCreatorId || !platformTierId) {
    console.error('Missing platform metadata in payment:', { metadata })
    return
  }

  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      userId: platformUserId,
      creatorId: platformCreatorId,
    },
  })

  if (existingSubscription) {
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: { status: 'ACTIVE', whopMembershipId: membershipId },
    })
    return
  }

  await prisma.subscription.create({
    data: {
      userId: platformUserId,
      creatorId: platformCreatorId,
      tierId: platformTierId,
      whopMembershipId: membershipId,
      status: 'ACTIVE',
    },
  })
}

async function handleCancelAtPeriodEndChanged(data: any) {
  const membershipId = data.id

  if (!membershipId) {
    console.error('Missing membership ID in webhook')
    return
  }

  const subscription = await prisma.subscription.findUnique({
    where: { whopMembershipId: membershipId },
  })

  if (!subscription) {
    console.error('Subscription not found for membership:', membershipId)
    return
  }

  // If cancel_at_period_end is true, set to CANCELING
  // If it's false (user reactivated), set back to ACTIVE
  const newStatus = data.cancel_at_period_end ? 'CANCELING' : 'ACTIVE'

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: newStatus },
  })
}

async function handleMembershipDeactivated(data: any) {
  const membershipId = data.id

  const subscription = await prisma.subscription.findUnique({
    where: { whopMembershipId: membershipId },
  })

  if (!subscription) {
    console.error('Subscription not found for membership:', membershipId)
    return
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'CANCELED' },
  })
}
