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

  const accountLink = await whop.accountLinks.create({
    company_id: creator.whopCompanyId,
    use_case: 'payouts_portal',
    return_url: `${baseUrl}/creator/payouts?returned=true`,
    refresh_url: `${baseUrl}/creator/payouts`,
  })

  return NextResponse.json({ url: accountLink.url })
}
