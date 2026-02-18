# Patreon Clone with Whop Payments Network (WPN) - Part 3: Access & Growth

> **This is Part 3 of a 3-part tutorial series.**
> - **Part 1 (https://raw.githubusercontent.com/whopio/whop-tutorials/refs/heads/main/patreon-clone/guides/patreon-clone-guide-part1.md)**: Foundation - Project setup, database, authentication, SDK setup, creator registration (Steps 1-5)
> - **Part 2 (https://raw.githubusercontent.com/whopio/whop-tutorials/refs/heads/main/patreon-clone/guides/patreon-clone-guide-part2.md)**: Monetization - Subscription tiers, content management, checkouts, webhooks (Steps 6-9)
> - **Part 3 (this file, https://raw.githubusercontent.com/whopio/whop-tutorials/refs/heads/main/patreon-clone/guides/patreon-clone-guide-part3.md)**: Access & Growth - Content gating, payouts, homepage, deployment (Steps 10-14)
>
> Each part builds on the previous. Complete them in order.

---

## Where We Left Off

In Part 1, you built authentication and creator accounts. In Part 2, you added:
- Subscription tiers that create Whop plans
- Content (posts) with minimum tier requirements
- Checkout flow using Whop's hosted payment page
- Webhooks that create subscription records on payment success

Now we'll complete the app with content gating, payouts, user-facing features, and deployment.

---

# Step 10: Gating Creator Content

## Why This Step Matters
Content gating is **why users pay** - they're buying access to exclusive content. This step implements:
- Price-based tier hierarchy: Higher-priced tiers access all lower-tier content
- Blurred preview for locked content
- Full content display for authorized subscribers

Without gating, all content would be visible to everyone, removing the incentive to subscribe.

**Docs**: [Check Access API](https://docs.whop.com/api-reference/users/check-access.md)

## Tier Hierarchy Logic
Tiers are sorted by price. A $15/month subscriber can access:
- All $15/month tier content
- All $10/month tier content
- All $5/month tier content

```
$50 VIP Tier    → Access: VIP + Premium + Basic
$15 Premium Tier → Access: Premium + Basic
$5 Basic Tier   → Access: Basic only
```

## lib/access.ts
Helper function that determines if a user can view a post based on their subscription tier.

```
import { Tier } from '@prisma/client'

interface AccessCheckParams {
  postMinimumTierId: string | null
  userTierId: string | null
  allTiers: Tier[]
}

export function canAccessPost({
  postMinimumTierId,
  userTierId,
  allTiers,
}: AccessCheckParams): boolean {
  // Public posts (no minimum tier) are accessible to everyone
  if (!postMinimumTierId) {
    return true
  }

  // No subscription means no access to gated content
  if (!userTierId) {
    return false
  }

  // Sort tiers by price to determine hierarchy
  const sortedTiers = [...allTiers].sort((a, b) => a.priceInCents - b.priceInCents)

  const userTierIndex = sortedTiers.findIndex(t => t.id === userTierId)
  const postTierIndex = sortedTiers.findIndex(t => t.id === postMinimumTierId)

  // User can access if their tier is equal or higher than the post's minimum
  return userTierIndex >= postTierIndex
}
```

## app/creator/[username]/page.tsx (Updated)
Full creator profile with content gating. Locked posts show blurred preview.

```
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { canAccessPost } from '@/lib/access'
import Link from 'next/link'

interface ProfilePageProps {
  params: Promise<{ username: string }>
  searchParams: Promise<{ subscribed?: string; already_subscribed?: string }>
}

export default async function CreatorProfilePage({
  params,
  searchParams,
}: ProfilePageProps) {
  const { username } = await params
  const { subscribed, already_subscribed } = await searchParams
  const user = await getCurrentUser()

  const creator = await prisma.creator.findUnique({
    where: { username },
    include: {
      tiers: { orderBy: { priceInCents: 'asc' } },
      posts: {
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        include: { minimumTier: true },
      },
      _count: { select: { subscriptions: true } },
    },
  })

  if (!creator) notFound()

  // Check user's subscription
  let userSubscription = null
  if (user) {
    userSubscription = await prisma.subscription.findUnique({
      where: { userId_creatorId: { userId: user.id, creatorId: creator.id } },
      include: { tier: true },
    })
  }

  const isActiveSubscriber = userSubscription?.status === 'ACTIVE'

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      {subscribed === 'true' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            Thanks for subscribing! Your subscription is being processed.
          </p>
          <p className="text-green-700 text-sm mt-1">
            You'll have access to exclusive content once the payment is confirmed.
          </p>
        </div>
      )}

      {already_subscribed === 'true' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">You're already subscribed to this creator!</p>
        </div>
      )}

      {/* Creator info */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{creator.displayName}</h1>
        <p className="text-gray-600">@{creator.username}</p>
        {creator.bio && <p className="mt-4 text-gray-700">{creator.bio}</p>}
        <p className="mt-2 text-sm text-gray-500">
          {creator._count.subscriptions} subscriber{creator._count.subscriptions !== 1 ? 's' : ''}
        </p>
        {isActiveSubscriber && userSubscription && (
          <p className="mt-2 text-sm text-green-600 font-medium">
            ✓ Subscribed to {userSubscription.tier.name}
          </p>
        )}
      </div>

      {/* Posts section with gating */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4">Posts</h2>
        {creator.posts.length === 0 ? (
          <p className="text-gray-500">No posts yet.</p>
        ) : (
          <div className="space-y-4">
            {creator.posts.map((post) => {
              // CHECK ACCESS using tier hierarchy
              const hasAccess = canAccessPost({
                postMinimumTierId: post.minimumTierId,
                userTierId: isActiveSubscriber ? userSubscription.tierId : null,
                allTiers: creator.tiers,
              })

              return (
                <div key={post.id} className="p-6 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium">{post.title}</h3>
                    {post.minimumTier && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {post.minimumTier.name}
                      </span>
                    )}
                  </div>

                  {hasAccess ? (
                    // UNLOCKED: Show full content
                    <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                  ) : (
                    // LOCKED: Show blurred preview
                    <div className="relative">
                      <p className="text-gray-400 blur-sm select-none">
                        {post.content.substring(0, 150)}...
                      </p>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-gray-600 font-medium">Subscribe to unlock</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {post.minimumTier?.name} tier or higher
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-4">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Subscription tiers */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          {isActiveSubscriber ? 'Subscription Tiers' : 'Subscribe'}
        </h2>
        {creator.tiers.length === 0 ? (
          <p className="text-gray-500">No subscription tiers available yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {creator.tiers.map((tier) => {
              const isCurrentTier = userSubscription?.tierId === tier.id

              return (
                <div
                  key={tier.id}
                  className={`p-6 border rounded-lg flex flex-col justify-between ${
                    isCurrentTier ? 'border-green-500 bg-green-50' : ''
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium">{tier.name}</h3>
                      {isCurrentTier && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    {tier.description && (
                      <p className="text-sm text-gray-600 mt-1">{tier.description}</p>
                    )}
                    <p className="text-2xl font-bold mt-4">
                      ${(tier.priceInCents / 100).toFixed(2)}
                      <span className="text-sm font-normal text-gray-500">/month</span>
                    </p>
                  </div>
                  {!isActiveSubscriber && (
                    <Link
                      href={`/subscribe/${creator.username}/${tier.id}`}
                      className="mt-4 block text-center px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
                    >
                      Subscribe
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
```

## Testing This Step
1. As a creator: Create posts with different minimum tiers
2. Sign out and view creator profile - all posts should show "Subscribe to unlock"
3. Sign in as a subscriber with Basic tier - see Basic posts, Premium posts still locked
4. Sign in as a subscriber with Premium tier - see both Basic and Premium posts
5. Verify blurred preview shows partial content with lock overlay

---

---

# Step 11: Creator Payouts

## Why This Step Matters
When subscribers pay, money goes to the creator's **Whop balance** (their connected account). Creators need a way to:
1. View their balance
2. Complete identity verification (KYC)
3. Add bank accounts
4. Withdraw earnings

This step uses Whop's **hosted payout portal** - a simple redirect to Whop's page where creators manage all payout settings.

**Docs**: [Enable Connected Account Payouts](https://docs.whop.com/developer/platforms/render-payout-portal.md) | [Account Links API](https://docs.whop.com/api-reference/account-links/create-account-link.md)

## Payout Portal vs Embedded Components
- **Hosted portal** (this tutorial): Simple redirect, no extra dependencies
- **Embedded components**: Payout UI embedded directly in your app (requires additional setup)

## app/api/creator/payouts/route.ts
Generates a temporary link to Whop's hosted payout portal.

**Key WPN call**: `whop.accountLinks.create()` with `use_case: 'payouts_portal'`

Uses `requireCreator()` which checks both authentication and creator status in one call.

```
import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/auth'
import { whop } from '@/lib/whop'

export async function POST() {
  const { creator, error } = await requireCreator()
  if (error) return error

  if (!creator.whopCompanyId) {
    return NextResponse.json(
      { error: 'Creator account not set up for payments' },
      { status: 400 }
    )
  }

  const baseUrl = process.env.AUTH_URL || 'http://localhost:3000'

  // GENERATE PAYOUT PORTAL LINK
  const accountLink = await whop.accountLinks.create({
    company_id: creator.whopCompanyId,
    use_case: 'payouts_portal',
    return_url: `${baseUrl}/creator/payouts?returned=true`,
    refresh_url: `${baseUrl}/creator/payouts`,
  })

  return NextResponse.json({ url: accountLink.url })
}
```

## Account Link Use Cases
The `accountLinks.create()` API has two primary use cases:
- `'account_onboarding'` - KYC verification (Step 5)
- `'payouts_portal'` - Balance and withdrawal management (this step)

Both generate temporary URLs that expire, so generate fresh links each time.

## app/creator/payouts/page.tsx
Server component showing payout options.

```
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import PayoutButton from './PayoutButton'

interface PayoutsPageProps {
  searchParams: Promise<{ returned?: string }>
}

export default async function PayoutsPage({ searchParams }: PayoutsPageProps) {
  const { returned } = await searchParams
  const user = await getCurrentUser()

  if (!user) redirect('/signin')

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
  })

  if (!creator) redirect('/creator/register')

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Payouts</h1>
          <p className="text-gray-600">Manage your earnings and withdrawals</p>
        </div>
        <Link href="/creator/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      {returned === 'true' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Payout settings updated successfully.</p>
        </div>
      )}

      {!creator.whopOnboarded ? (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h2 className="font-medium mb-2">Complete account setup first</h2>
          <p className="text-sm text-gray-600 mb-4">
            You need to complete your creator onboarding before you can access payouts.
          </p>
          <Link
            href="/creator/dashboard"
            className="inline-block px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
          >
            Go to dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-6 border rounded-lg">
            <h2 className="text-lg font-medium mb-2">Payout Portal</h2>
            <p className="text-gray-600 mb-4">
              Access Whop's payout portal to view your balance, complete identity verification,
              add payout methods, and withdraw your earnings.
            </p>
            <PayoutButton />
          </div>

          <div className="p-6 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">How payouts work</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Subscriber payments go to your Whop company balance</li>
              <li>• Complete identity verification (KYC) to enable withdrawals</li>
              <li>• Add a bank account or other payout method</li>
              <li>• Withdraw funds manually or set up automatic payouts</li>
            </ul>
          </div>
        </div>
      )}
    </main>
  )
}
```

## app/creator/payouts/PayoutButton.tsx
Client component that fetches and redirects to payout portal.

```
'use client'

import { useState } from 'react'

export default function PayoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)

    try {
      const response = await fetch('/api/creator/payouts', { method: 'POST' })

      if (!response.ok) {
        throw new Error('Failed to get payout portal link')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to open payout portal. Please try again.')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition disabled:opacity-50"
    >
      {loading ? 'Opening...' : 'Open Payout Portal'}
    </button>
  )
}
```

## Add Link to Creator Dashboard
Update `app/creator/dashboard/page.tsx` to include a Payouts link:

```
<Link
  href="/creator/payouts"
  className="block p-4 border rounded-lg hover:bg-gray-50 transition"
>
  <h3 className="font-medium">Payouts</h3>
  <p className="text-sm text-gray-600">View balance and withdraw earnings</p>
</Link>
```

## Testing This Step
1. Sign in as a creator who has completed onboarding
2. Go to http://localhost:3000/creator/dashboard
3. Click "Payouts" link
4. Click "Open Payout Portal"
5. You'll be redirected to Whop's hosted payout page
6. After returning, you should see the success message

---

---

# Step 12: Homepage, Subscriptions Dashboard, and Creator Discovery

## Why This Step Matters
This step completes the user-facing app with:
- **Homepage**: Landing page with creator discovery
- **Subscriptions dashboard**: Users manage and cancel subscriptions
- **Cancel flow**: Schedules cancellation at period end via WPN

The cancellation feature introduces a new WPN concept: `membership.cancel()` with `cancellation_mode: 'at_period_end'`.

**Docs**: [Cancel Membership API](https://docs.whop.com/api-reference/memberships/cancel-membership.md) | [Membership Cancel Event](https://docs.whop.com/api-reference/memberships/membership-cancel-at-period-end-changed.md)

## Schema Update: CANCELING Status
Add a status for subscriptions scheduled for cancellation:

```
enum SubscriptionStatus {
  ACTIVE
  CANCELING    // Scheduled to cancel at period end
  CANCELED
  PAST_DUE
  EXPIRED
}
```

Run migration:
```
npx prisma migrate dev --name add_canceling_status
```

## app/api/subscriptions/[id]/cancel/route.ts
Cancels subscription at period end using WPN membership API.

**Key WPN call**: `whop.memberships.cancel()` with `cancellation_mode: 'at_period_end'`

Uses `requireAuth()` for authentication.

```
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
```

## app/api/webhooks/whop/route.ts (Updated)
Add handlers for cancellation webhooks.

```
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
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
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
    where: { userId: platformUserId, creatorId: platformCreatorId },
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
  if (!membershipId) return

  const subscription = await prisma.subscription.findUnique({
    where: { whopMembershipId: membershipId },
  })

  if (!subscription) return

  // Toggle between CANCELING and ACTIVE based on cancel_at_period_end flag
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

  if (!subscription) return

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'CANCELED' },
  })
}
```

## Update Whop Webhook Settings
Add the new event to your webhook in Whop dashboard:
1. Developer page → Edit webhook
2. Enable `membership_cancel_at_period_end_changed` event
3. Enable `membership_deactivated` event (optional, for final cancellation)
4. Save

## UI Components

### app/subscriptions/page.tsx
Server component:
- Data: `prisma.subscription.findMany({ where: { userId, status: { in: ['ACTIVE', 'CANCELING'] } }, include: { creator, tier } })`
- Shows subscription cards with cancel button (if ACTIVE) or "Cancels at period end" badge (if CANCELING)

### app/subscriptions/CancelButton.tsx
Client component:
- Shows confirmation dialog before canceling
- POST to `/api/subscriptions/[id]/cancel`
- On success: `router.refresh()`

### app/LogoutButton.tsx
Client component for sign out functionality.

```
'use client'

export default function LogoutButton() {
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-600 hover:text-red-600 transition"
    >
      Sign out
    </button>
  )
}
```

### app/Header.tsx
Server component with navigation and authentication state.

```
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import LogoutButton from './LogoutButton'

export default async function Header() {
  const user = await getCurrentUser()

  let creator = null
  if (user) {
    creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { username: true },
    })
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto px-8 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-gray-900">
          Creator Platform
        </Link>

        <nav className="flex items-center gap-6">
          {user ? (
            <>
              <Link
                href="/subscriptions"
                className="text-sm text-gray-600 hover:text-green-600 transition"
              >
                Subscriptions
              </Link>
              {creator ? (
                <Link
                  href={`/creator/${creator.username}`}
                  className="text-sm text-gray-600 hover:text-green-600 transition"
                >
                  My Profile
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-green-600 transition"
                >
                  Dashboard
                </Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/signin"
              className="text-sm px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
```

### app/page.tsx (Homepage)
Server component with pagination support.

```
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import CreatorSearch from './CreatorSearch'

const CREATORS_PER_PAGE = 12

interface HomePageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { page } = await searchParams
  const user = await getCurrentUser()

  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const skip = (currentPage - 1) * CREATORS_PER_PAGE

  const [creators, totalCount] = await Promise.all([
    prisma.creator.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: CREATORS_PER_PAGE,
    }),
    prisma.creator.count(),
  ])

  const totalPages = Math.ceil(totalCount / CREATORS_PER_PAGE)

  return (
    <main className="min-h-screen">
      <div className="py-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            Support creators you love
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Subscribe to your favorite creators and get access to exclusive content. Join a community of fans and creators.
          </p>
          {user ? (
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/signin"
              className="inline-block px-6 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition"
            >
              Get started
            </Link>
          )}
        </div>
      </div>

      <div className="py-16 px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12 text-gray-900">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <img
                src="/FindCreators.svg"
                alt="Find creators"
                width={48}
                height={48}
                className="mx-auto mb-4"
              />
              <h3 className="font-semibold mb-2 text-gray-900">Find creators</h3>
              <p className="text-gray-600 text-sm">
                Discover creators who share content you care about.
              </p>
            </div>
            <div className="text-center">
              <img
                src="/Subscribe.svg"
                alt="Subscribe"
                width={48}
                height={48}
                className="mx-auto mb-4"
              />
              <h3 className="font-semibold mb-2 text-gray-900">Subscribe</h3>
              <p className="text-gray-600 text-sm">
                Choose a tier that fits your budget and subscribe monthly.
              </p>
            </div>
            <div className="text-center">
              <img
                src="/EnjoyContent.svg"
                alt="Enjoy content"
                width={48}
                height={48}
                className="mx-auto mb-4"
              />
              <h3 className="font-semibold mb-2 text-gray-900">Enjoy content</h3>
              <p className="text-gray-600 text-sm">
                Get access to exclusive posts and support creators directly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">Find creators</h2>
          <CreatorSearch
            creators={creators}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        </div>
      </div>
    </main>
  )
}
```

### app/CreatorSearch.tsx
Client component with search and pagination.

```
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Creator {
  id: string
  username: string
  displayName: string
}

interface CreatorSearchProps {
  creators: Creator[]
  currentPage: number
  totalPages: number
}

export default function CreatorSearch({ creators, currentPage, totalPages }: CreatorSearchProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filteredCreators = creators.filter((creator) => {
    const searchLower = search.toLowerCase()
    return (
      creator.displayName.toLowerCase().includes(searchLower) ||
      creator.username.toLowerCase().includes(searchLower)
    )
  })

  function goToPage(page: number) {
    router.push(`/?page=${page}`)
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search by name or username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />

      {filteredCreators.length === 0 ? (
        <p className="text-center text-gray-500">
          {search ? 'No creators found.' : 'No creators yet.'}
        </p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCreators.map((creator) => (
              <Link
                key={creator.id}
                href={`/creator/${creator.username}`}
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition"
              >
                <p className="font-medium text-gray-900">{creator.displayName}</p>
                <p className="text-sm text-gray-500">@{creator.username}</p>
              </Link>
            ))}
          </div>

          {totalPages > 1 && !search && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

## Testing This Step
1. Visit http://localhost:3000 - see homepage with creator search
2. Search for creators - filter works on name/username
3. Log in and go to /subscriptions
4. If you have active subscriptions, click Cancel
5. Confirm cancellation - status changes to "Cancels at period end"
6. Check Prisma Studio - subscription status should be CANCELING
7. Verify webhook receives `membership.cancel_at_period_end_changed` event

---

---

# Step 13: Deploying the Project

## Why This Step Matters
Moving from sandbox to production involves:
1. **Production Whop credentials**: Real API keys from whop.com (not sandbox.whop.com)
2. **Cloud database**: Vercel Postgres/Neon instead of local PostgreSQL
3. **HTTPS**: Required for OAuth redirects and webhook URLs
4. **Production webhook**: New webhook pointing to deployed URL

Without deployment, your app only works locally - no real payments, no OAuth redirects.

**Docs**: [Sandbox Testing Guide](https://docs.whop.com/developer/guides/sandbox.md)

## Production vs Sandbox
| Aspect | Sandbox | Production |
|--------|---------|------------|
| Dashboard | sandbox.whop.com | whop.com |
| API | sandbox-api.whop.com | api.whop.com |
| Payments | Test cards only | Real payments |
| OAuth | Works on localhost | Requires HTTPS |

## 1. Get Production Whop Credentials
Go to **whop.com** (not sandbox):

### Company ID
- Dashboard URL contains `biz_xxxxxxxxxxxxx`

### API Key
Developer page → Company API Keys → Create with same permissions as sandbox (see Step 4).

### App ID
Developer page → Apps → Create app → Copy `app_xxxxxxxxxxxxx`

## 2. Generate New Session Secret
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Use a NEW secret for production (don't reuse development secret).

## 3. Update Prisma for Vercel Postgres
Update `prisma/schema.prisma` datasource:

```
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLED")
}
```

Add to `package.json` scripts:
```
"postinstall": "prisma generate"
```

## 4. Push to GitHub
```
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/project-name.git
git branch -M main
git push -u origin main
```

## 5. Deploy to Vercel

### Initial Deployment
1. Vercel.com → Add new → Project
2. Import your GitHub repository
3. Add environment variables (see Environment Variables section at top)
4. Deploy (will fail until database is set up)

### Create Database
1. Vercel project → Storage tab
2. Create Database → Neon
3. Select region, plan, name
4. Connect to your project

### Run Migrations
Add Vercel Postgres URLs to local `.env`, then run:
```
npx prisma migrate deploy
```

### Configure Whop for Production
1. Update OAuth redirect: `https://your-project.vercel.app/api/auth/callback`
2. Create production webhook: `https://your-project.vercel.app/api/webhooks/whop`
3. Enable "Connected account events" and required webhook events
4. Update `WHOP_WEBHOOK_SECRET` in Vercel

### Redeploy
Deployments → Context menu → Redeploy

## Testing Production
Verify these all work:
1. Sign in with Whop OAuth
2. Register as a creator
3. Complete KYC onboarding
4. Create tiers and posts
5. Subscribe to a creator (real payment)
6. View gated content
7. Cancel subscription
8. Access payout portal

---

---

# Step 14: What's Next

## Extension Ideas

### Payment & Subscription Features (WPN)
- **Promo codes**: [Create Promo Code API](https://docs.whop.com/api-reference/promo-codes/create-promo-code.md)
- **Free trials**: [Free Trials Guide](https://docs.whop.com/manage-your-business/products/free-trials.md)
- **Annual memberships**: Create yearly billing plans with different `billing_period`
- **Tier upgrades/downgrades**: [Update Membership API](https://docs.whop.com/api-reference/memberships/update-membership.md)
- **Embedded checkouts**: [Embed Checkout Guide](https://docs.whop.com/payments/checkout-embed.md)
- **Failed payment handling**: [Payment Failed Event](https://docs.whop.com/api-reference/payments/payment-failed.md)
- **Refunds**: [Refund Payment API](https://docs.whop.com/api-reference/payments/refund-payment.md)

### Creator Tools
- **Analytics dashboard**: Revenue trends, subscriber growth
- **File attachments**: Storage system for post attachments
- **Scheduled posts**: Future-dated publishing
- **Subscriber management**: View/manage subscriber list
- **Custom profiles**: Colors, banners, profile pictures

### Subscriber Experience
- **Comments/likes**: Engagement features on posts
- **Content search**: Search within creator's posts

### Growth
- **Creator categories/tags**: Browsable categories
- **Featured creators**: Homepage highlights
- **SEO**: Meta tags, Open Graph, structured data

### Technical
- **Rate limiting**: Protect API routes
- **Error monitoring**: Sentry or similar
- **Caching**: Redis/edge caching for performance
- **Mobile app**: [Whop iOS SDK](https://docs.whop.com/developer/guides/ios/overview.md) | [React Native Guide](https://docs.whop.com/developer/guides/react-native.md)
- **AI integration**: [AI and MCP Guide](https://docs.whop.com/developer/guides/ai_and_mcp.md)

---

## Tutorial Complete!

Congratulations! You've built a fully functional Patreon-style creator platform with:

**Part 1 - Authentication & Data:**
- Next.js 16 project with TypeScript and Prisma
- PostgreSQL database with User, Creator, Tier, Post, and Subscription models
- Whop OAuth authentication
- Creator registration with WPN connected accounts

**Part 2 - Monetization:**
- Subscription tier management with Whop plans
- Content creation with tier-based access requirements
- Checkout flow using Whop's hosted payment page
- Webhook handling for payment events

**Part 3 - Access & Growth:**
- Content gating with tier hierarchy
- Creator payout portal integration
- Homepage with creator discovery and pagination
- Production deployment on Vercel


The platform is now ready for real creators and subscribers. Happy building!
