# Patreon Clone with Whop Payments Network (WPN) - Part 2: Monetization

> **This is Part 2 of a 3-part tutorial series.**
> - **Part 1 (https://whop.com/blog/content/files/2026/02/patreon-clone-guide-part1.md)**: Foundation - Project setup, database, authentication, SDK setup, creator registration (Steps 1-5)
> - **Part 2 (this file, https://whop.com/blog/content/files/2026/02/patreon-clone-guide-part2.md)**: Monetization - Subscription tiers, content management, checkouts, webhooks (Steps 6-9)
> - **Part 3 (https://whop.com/blog/content/files/2026/02/patreon-clone-guide-part3.md)**: Access & Growth - Content gating, payouts, homepage, deployment (Steps 10-14)
>
> Each part builds on the previous. Complete them in order.

---

## Where We Left Off

In Part 1, you built the foundation:
- Project structure with Next.js, TypeScript, Prisma, and PostgreSQL
- Database schema with User, Creator, Tier, Post, and Subscription models
- Whop OAuth authentication (users sign in with Whop accounts)
- Whop SDK configured for API calls
- Creator registration that creates WPN connected accounts

Now we'll add the monetization layer: tiers, content, payments, and webhooks.

---

# Step 6: Subscription Tier Management

## Why This Step Matters
Tiers are the **sellable items** in your platform. In WPN, the hierarchy is:
- **Product** (`prod_xxx`): A container that groups related plans (one per creator)
- **Plan** (`plan_xxx`): A specific price point within a product (one per tier)

When a user subscribes, they purchase a **plan**. The plan determines the price, billing period, and which product (creator) they're subscribing to. Without plans, there's nothing for users to buy.

**Docs**: [Accept Payments](https://docs.whop.com/developer/guides/accept-payments.md) | [Create Plan API](https://docs.whop.com/api-reference/plans/create-plan.md)

## WPN Product/Plan Model
```
Creator's Connected Account (biz_xxx)
  └── Product: "Creator's Membership" (prod_xxx)
       └── Plan: "Basic Tier" - $5/month (plan_xxx)
       └── Plan: "Premium Tier" - $15/month (plan_xxx)
       └── Plan: "VIP Tier" - $50/month (plan_xxx)
```

Each creator has ONE product containing multiple plans (tiers). This is stored as:
- `Creator.whopProductId` → The product container
- `Tier.whopPlanId` → Individual purchasable plans

## Schema Update (Step 2 reference)
Add `whopProductId` to Creator model if not already present:
```
model Creator {
  // ... existing fields
  whopProductId   String?  @unique  // Whop product for tiers - prod_xxx format
}
```

Run migration:
```
npx prisma migrate dev --name add_whop_product_id
```

## app/api/creator/tiers/route.ts
Creates Whop products and plans when creators add tiers.

**Key WPN calls**:
- `whop.products.create()` - Creates the product container (once per creator)
- `whop.plans.create()` - Creates a purchasable plan for each tier

Uses `requireCreator()` for authentication, Zod for validation, and rate limiting.

```
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
```

## app/api/creator/tiers/[tierId]/route.ts
Updates and deletes tiers (and their Whop plans).

**Key WPN calls**:
- `whop.plans.update()` - Updates plan pricing
- `whop.plans.delete()` - Removes plan from Whop

Uses `requireCreator()` for authentication, Zod for validation, and rate limiting.

```
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
```

## UI Pages (Logic Descriptions)

### app/creator/tiers/page.tsx
Server component:
- Data: `getCurrentUser()`, `prisma.creator.findUnique({ include: { tiers: { orderBy: { priceInCents: 'asc' } } } })`
- Redirect: !user → /signin, !creator → /creator/register
- Show: TierForm for creating new tiers, list of TierCards

### app/creator/tiers/TierForm.tsx
Client component form:
- Fields: name, description (optional), price (minimum $1)
- POST to `/api/creator/tiers` (create) or PUT to `/api/creator/tiers/[id]` (edit)
- On success: `router.refresh()`

### app/creator/tiers/TierCard.tsx
Client component:
- Displays tier name, description, price
- Edit button → shows TierForm inline
- Delete button → DELETE to `/api/creator/tiers/[id]` with confirmation

## Testing This Step
1. Sign in and go to http://localhost:3000/creator/dashboard
2. Click "Manage tiers" button
3. Create a tier with name, description, and price (minimum $1)
4. Check Prisma Studio → Tier table should have `whopPlanId` starting with `plan_`
5. Check Creator table → should now have `whopProductId` starting with `prod_`
6. Try editing the tier - changes should persist
7. Try deleting a tier - should remove from both database and Whop

---

---

# Step 7: Creator Profiles and Content

## Why This Step Matters
This step builds the **content system** - what subscribers are actually paying for. Key pieces:
- **Public profile**: Where users discover creators and see available tiers (with Subscribe buttons)
- **Posts**: The gated content that subscribers pay to access
- **minimumTierId**: Links each post to a tier, enabling content gating (implemented in Step 10)

Without this, there's nothing for subscribers to access after they pay.

**Docs**: [Locked Content and Upsells](https://docs.whop.com/manage-your-business/products/locked-premium-content.md)

## Content Gating Preview
Posts use a `minimumTierId` to specify the cheapest tier that can access the content. In Step 10, the access logic compares the user's subscription tier price against the post's minimum tier price - higher-paying subscribers can access all lower-tier content.

## app/creator/[username]/page.tsx
Public creator profile - displays creator info and tier "Subscribe" buttons.

**Note**: Subscribe buttons link to `/subscribe/[username]/[tierId]` which triggers Whop checkout (Step 8).

```
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

export default async function CreatorProfilePage({ params }: ProfilePageProps) {
  const { username } = await params

  const creator = await prisma.creator.findUnique({
    where: { username },
    include: {
      tiers: {
        orderBy: { priceInCents: 'asc' },
        include: { _count: { select: { subscriptions: true } } },
      },
      _count: { select: { subscriptions: true } },
    },
  })

  if (!creator) {
    notFound()
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{creator.displayName}</h1>
        <p className="text-gray-600">@{creator.username}</p>
        {creator.bio && <p className="mt-4 text-gray-700">{creator.bio}</p>}
        <p className="mt-2 text-sm text-gray-500">
          {creator._count.subscriptions} subscriber{creator._count.subscriptions !== 1 ? 's' : ''}
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Subscribe</h2>
        {creator.tiers.length === 0 ? (
          <p className="text-gray-500">No subscription tiers available yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {creator.tiers.map((tier) => (
              <div key={tier.id} className="p-6 border rounded-lg flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-medium">{tier.name}</h3>
                  {tier.description && <p className="text-sm text-gray-600 mt-1">{tier.description}</p>}
                  <p className="text-2xl font-bold mt-4">
                    ${(tier.priceInCents / 100).toFixed(2)}
                    <span className="text-sm font-normal text-gray-500">/month</span>
                  </p>
                </div>
                <Link
                  href={`/subscribe/${creator.username}/${tier.id}`}
                  className="mt-4 block text-center px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
                >
                  Subscribe
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
```

## app/api/creator/posts/route.ts
CRUD for creator posts. Posts require a `minimumTierId` for content gating.

Uses `requireCreator()` for authentication, Zod for validation, and rate limiting.

```
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
```

## app/api/creator/posts/[postId]/route.ts
Update and delete posts.

Uses `requireCreator()` for authentication, Zod for validation, and rate limiting.

```
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
```

## UI Pages (Logic Descriptions)

### app/creator/posts/page.tsx
Server component:
- Data: `getCurrentUser()`, `prisma.creator.findUnique({ include: { tiers, posts: { include: { minimumTier } } } })`
- Redirect: !user → /signin, !creator → /creator/register
- If no tiers: Show warning prompting to create tiers first
- Show: PostForm for creating, list of PostCards

### app/creator/posts/PostForm.tsx
Client component form:
- Fields: title, content (textarea), minimumTierId (select from tiers), published (checkbox)
- POST to `/api/creator/posts` (create) or PUT to `/api/creator/posts/[id]` (edit)
- On success: `router.refresh()`

### app/creator/posts/PostCard.tsx
Client component:
- Displays title, content preview (line-clamp-2), draft badge if unpublished, minimum tier, date
- Edit button → shows PostForm inline
- Delete button → DELETE to `/api/creator/posts/[id]` with confirmation

## Testing This Step
1. Sign in as a creator and go to http://localhost:3000/creator/dashboard
2. Click "View public profile" - should see your profile with tiers and Subscribe buttons
3. Go back to dashboard and click "Create content"
4. If no tiers exist, create one first (you'll be prompted)
5. Create a post with title, content, select a minimum tier, and publish
6. Check Prisma Studio → Post table should have your post with `minimumTierId` set
7. Try editing and deleting posts

---

---

# Step 8: Checkouts

## Why This Step Matters
This step creates the **payment flow** - how users actually pay for subscriptions. The key WPN concept here is **checkout configurations**:
- A checkout configuration generates a `purchase_url` that redirects users to Whop's hosted checkout
- The checkout is created on the creator's **connected account** using their `plan_id`
- Metadata passes through to webhooks, linking the payment to your database records

Without checkouts, users can browse tiers but cannot purchase them.

**Docs**: [Collect Payments for Connected Accounts](https://docs.whop.com/developer/platforms/collect-payments-for-connected-accounts.md) | [Checkout Configuration API](https://docs.whop.com/api-reference/checkout-configurations/create-checkout-configuration.md)

## Payment Flow
```
User clicks "Subscribe" → /subscribe/[username]/[tierId] page
  → Clicks "Continue to checkout" → POST /api/checkout
    → whop.checkoutConfigurations.create() with creator's plan_id + metadata
      → Returns purchase_url → User redirected to Whop checkout
        → User pays → Whop sends webhook (Step 9)
          → Your app creates Subscription record
```

## app/subscribe/[username]/[tierId]/page.tsx
Pre-checkout page showing tier details before payment.

```
import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import CheckoutButton from './CheckoutButton'

interface SubscribePageProps {
  params: Promise<{ username: string; tierId: string }>
}

export default async function SubscribePage({ params }: SubscribePageProps) {
  const { username, tierId } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/signin?redirect=/subscribe/${username}/${tierId}`)
  }

  const creator = await prisma.creator.findUnique({
    where: { username },
    include: {
      tiers: { orderBy: { priceInCents: 'asc' } },
      _count: { select: { subscriptions: true } },
    },
  })

  if (!creator) notFound()

  const tier = creator.tiers.find((t) => t.id === tierId)
  if (!tier) notFound()

  // Check if already subscribed
  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId_creatorId: { userId: user.id, creatorId: creator.id } },
  })

  if (existingSubscription) {
    redirect(`/creator/${username}?already_subscribed=true`)
  }

  // Count accessible posts for this tier
  const tierIndex = creator.tiers.findIndex((t) => t.id === tierId)
  const accessibleTierIds = creator.tiers.slice(0, tierIndex + 1).map((t) => t.id)
  const postCount = await prisma.post.count({
    where: { creatorId: creator.id, published: true, minimumTierId: { in: accessibleTierIds } },
  })

  return (
    <main className="min-h-screen p-8 max-w-xl mx-auto">
      <Link href={`/creator/${username}`} className="text-sm text-blue-600 hover:underline">
        ← Back to {creator.displayName}'s profile
      </Link>

      <div className="mt-6 p-6 border rounded-lg">
        <h1 className="text-2xl font-bold mb-1">Subscribe to {creator.displayName}</h1>
        <p className="text-gray-600 mb-6">@{creator.username}</p>

        <div className="p-4 bg-gray-50 rounded-lg mb-6">
          <h2 className="font-medium text-lg">{tier.name}</h2>
          {tier.description && <p className="text-sm text-gray-600 mt-1">{tier.description}</p>}
          <p className="text-3xl font-bold mt-4">
            ${(tier.priceInCents / 100).toFixed(2)}
            <span className="text-base font-normal text-gray-500">/month</span>
          </p>
        </div>

        <div className="mb-6 text-sm text-gray-600">
          <p>✓ Access to {postCount} post{postCount !== 1 ? 's' : ''}</p>
          <p>✓ Support {creator.displayName} directly</p>
          <p>✓ Cancel anytime</p>
        </div>

        <CheckoutButton creatorId={creator.id} tierId={tier.id} creatorUsername={creator.username} />

        <p className="text-xs text-gray-500 mt-4 text-center">
          Payments are securely processed by Whop
        </p>
      </div>
    </main>
  )
}
```

## app/subscribe/[username]/[tierId]/CheckoutButton.tsx
Client component that triggers checkout creation.

```
'use client'

import { useState } from 'react'

interface CheckoutButtonProps {
  creatorId: string
  tierId: string
  creatorUsername: string
}

export default function CheckoutButton({ creatorId, tierId, creatorUsername }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckout() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId, tierId, creatorUsername }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create checkout')
        return
      }

      // Redirect to Whop's hosted checkout
      window.location.href = data.checkoutUrl
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="p-3 mb-4 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          {error}
        </div>
      )}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full p-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition font-medium"
      >
        {loading ? 'Loading...' : 'Continue to checkout'}
      </button>
    </div>
  )
}
```

## app/api/checkout/route.ts
Creates a Whop checkout configuration on the creator's connected account.

**Key WPN call**: `whop.checkoutConfigurations.create()` with:
- `plan_id`: The tier's Whop plan (created in Step 6)
- `redirect_url`: Where to send user after payment (HTTPS required)
- `metadata`: Your database IDs - passed through to webhooks

Uses `requireAuth()` for authentication, Zod for validation, and rate limiting.

**Docs**: [Checkout Configuration API](https://docs.whop.com/api-reference/checkout-configurations/create-checkout-configuration.md)

```
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { prisma } from '@/lib/prisma'
import { whop } from '@/lib/whop'

const checkoutSchema = z.object({
  creatorId: z.string().min(1, 'Creator ID is required'),
  tierId: z.string().min(1, 'Tier ID is required'),
  creatorUsername: z.string().min(1, 'Creator username is required'),
})

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user.id)
  if (rateLimitError) return rateLimitError

  const body = await request.json()
  const parsed = checkoutSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { creatorId, tierId, creatorUsername } = parsed.data

  // Get the creator and tier
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    include: { tiers: true },
  })

  if (!creator || !creator.whopCompanyId) {
    return NextResponse.json(
      { error: 'Creator not found or not set up for payments' },
      { status: 404 }
    )
  }

  const tier = creator.tiers.find((t) => t.id === tierId)

  if (!tier) {
    return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
  }

  if (!tier.whopPlanId) {
    return NextResponse.json(
      { error: 'Tier not properly configured for payments' },
      { status: 400 }
    )
  }

  // Check if user is already subscribed
  const existingSubscription = await prisma.subscription.findUnique({
    where: {
      userId_creatorId: {
        userId: user.id,
        creatorId: creator.id,
      },
    },
  })

  if (existingSubscription) {
    return NextResponse.json(
      { error: 'You are already subscribed to this creator' },
      { status: 400 }
    )
  }

  try {
    // Use the existing plan that was created when the tier was set up
    const baseUrl = process.env.AUTH_URL || 'http://localhost:3000'
    const redirectUrl = baseUrl.startsWith('https://')
      ? `${baseUrl}/creator/${creatorUsername}?subscribed=true`
      : undefined // Whop requires https for redirect URLs

    // CREATE CHECKOUT on creator's connected account
    const checkoutConfig = await whop.checkoutConfigurations.create({
      plan_id: tier.whopPlanId,
      ...(redirectUrl && { redirect_url: redirectUrl }),
      metadata: {
        // These values come back in the webhook
        platform_user_id: user.id,
        platform_creator_id: creator.id,
        platform_tier_id: tier.id,
      },
    })

    return NextResponse.json({ checkoutUrl: checkoutConfig.purchase_url })
  } catch (error) {
    console.error('Checkout creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    )
  }
}
```

## Testing This Step
1. Sign in with a **different** Whop account (to simulate a subscriber)
2. Go to a creator's profile and click a tier's "Subscribe" button
3. On the tier details page, click "Continue to checkout"
4. Complete payment using test card `4242 4242 4242 4242`
5. After payment, you'll stay on Whop's page (redirect only works with HTTPS)
6. Check Whop sandbox dashboard → Connected accounts → [Creator's company] → Customers
7. The subscription won't appear in your database yet - that happens via webhooks (Step 9)

**Note**: Redirect back to your app only works with HTTPS URLs. For localhost testing, manually verify payment in Whop dashboard. After deployment (Step 13), redirects work automatically.

---

---

# Step 9: Handling Webhooks

## Why This Step Matters
Webhooks are **how your app knows a payment succeeded**. The flow is:
1. User completes checkout on Whop's hosted page
2. Whop sends a webhook to your server with payment details
3. Your server verifies the signature and creates the Subscription record

Without webhooks, your database never learns about successful payments - users would pay but get no access.

**Docs**: [Webhooks Guide](https://docs.whop.com/developer/guides/webhooks.md) | [Payment Succeeded Event](https://docs.whop.com/api-reference/payments/payment-succeeded.md)

## Webhook Architecture
```
Whop Checkout Completed
  → Whop sends POST to /api/webhooks/whop
    → whop.webhooks.unwrap() verifies signature
      → Extract metadata (user_id, creator_id, tier_id)
        → Create Subscription record in database
```

**Important**: Use **Company webhooks** (not App webhooks) for connected account payments. Company webhooks receive events for all child connected accounts automatically.

## ngrok Setup (Local Development)
Whop can't reach localhost, so use ngrok to tunnel:

```
npm install -g ngrok
ngrok http 3000
```

You'll get a URL like `https://abc123.ngrok-free.app` - use this for your webhook endpoint.

## Whop Webhook Configuration
1. Go to **sandbox.whop.com** → Developer page
2. In Webhooks section, click **Create webhook**
3. URL: `https://[your-ngrok-url]/api/webhooks/whop`
4. Enable `payment_succeeded` event
5. **Check "Connected account events"** checkbox (critical for platform payments)
6. Click Save
7. Copy the webhook secret (starts with `ws_`)

## Environment Variable
Add to `.env`:
```
WHOP_WEBHOOK_SECRET="ws_xxxxxxxxxxxxx"
```

## lib/whop.ts (Updated)
Add the `webhookKey` for signature verification:

```
import Whop from "@whop/sdk"

const isSandbox = process.env.WHOP_SANDBOX === 'true'

export const whop = new Whop({
  appID: process.env.WHOP_APP_ID,
  apiKey: process.env.WHOP_API_KEY,
  webhookKey: Buffer.from(process.env.WHOP_WEBHOOK_SECRET || "").toString('base64'),
  ...(isSandbox && { baseURL: "https://sandbox-api.whop.com/api/v1" }),
})
```

**Note**: The SDK requires base64-encoded webhook secret. The raw secret starts with `ws_`.

## app/api/webhooks/whop/route.ts
Receives and processes Whop webhooks.

**Key WPN call**: `whop.webhooks.unwrap()` - Verifies the webhook signature and returns parsed data.

```
import { NextRequest, NextResponse } from 'next/server'
import { whop } from '@/lib/whop'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const headers = Object.fromEntries(request.headers)

  try {
    // VERIFY WEBHOOK SIGNATURE
    // This ensures the webhook actually came from Whop
    const webhookData = whop.webhooks.unwrap(rawBody, { headers })

    const { type, data } = webhookData as any

    if (type === 'payment.succeeded') {
      await handlePaymentSucceeded(data)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook verification failed:', error)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }
}

async function handlePaymentSucceeded(data: any) {
  // Extract metadata passed from checkout configuration
  const metadata = data.checkout_configuration?.metadata || data.metadata

  const platformUserId = metadata?.platform_user_id
  const platformCreatorId = metadata?.platform_creator_id
  const platformTierId = metadata?.platform_tier_id
  const membershipId = data.membership?.id || data.id

  if (!platformUserId || !platformCreatorId || !platformTierId) {
    console.error('Missing platform metadata in payment:', { metadata })
    return
  }

  // Check for existing subscription (reactivation case)
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      userId: platformUserId,
      creatorId: platformCreatorId,
    },
  })

  if (existingSubscription) {
    // Reactivate existing subscription
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: { status: 'ACTIVE', whopMembershipId: membershipId },
    })
    return
  }

  // Create new subscription
  await prisma.subscription.create({
    data: {
      userId: platformUserId,
      creatorId: platformCreatorId,
      tierId: platformTierId,
      whopMembershipId: membershipId,  // Store for cancellation API
      status: 'ACTIVE',
    },
  })
}
```

## Webhook Events Reference
Events you can listen for:

| Event | When it fires | Use case |
|-------|---------------|----------|
| `payment.succeeded` | Payment completed | Create/activate subscription |
| `payment.failed` | Recurring payment failed | Mark as PAST_DUE |
| `membership.canceled` | Subscription ended | Mark as CANCELED |
| `refund_created` | Refund issued | Handle refunds |

This tutorial uses `payment.succeeded` as the primary event. Additional events can be added for production robustness.

## Testing This Step
1. Make sure ngrok is running: `ngrok http 3000`
2. Update webhook URL in Whop dashboard with new ngrok URL
3. Sign in with a **different** Whop account
4. Go to creator profile → Subscribe to a tier → Complete checkout with test card
5. Check your terminal for webhook log
6. Check Prisma Studio → Subscription table should have new record with:
   - `userId`: Your test user's ID
   - `creatorId`: The creator's ID
   - `tierId`: The tier's ID
   - `whopMembershipId`: Starting with `mem_`
   - `status`: ACTIVE

**Troubleshooting**:
- Webhook not received? Check ngrok is running and URL is correct in Whop dashboard
- Signature verification failed? Ensure `WHOP_WEBHOOK_SECRET` matches dashboard secret
- Missing metadata? Check that checkout was created with metadata in Step 8

---

## Part 2 Complete!

You now have a fully functional payment system:
- Subscription tiers that create Whop plans
- Content management with tier-based access requirements
- Checkout flow that redirects to Whop's hosted payment page
- Webhooks that create subscription records when payments succeed

**Continue to Part 3 (https://whop.com/blog/content/files/2026/02/patreon-clone-guide-part3.md)** to complete the app: content gating, creator payouts, homepage with discovery, and production deployment.