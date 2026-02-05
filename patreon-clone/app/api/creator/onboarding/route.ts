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

  try {
    // Whop requires https URLs, so use a placeholder for local development
    const baseUrl = process.env.AUTH_URL || 'http://localhost:3000'
    const useHttps = baseUrl.startsWith('https://')

    const accountLink = await whop.accountLinks.create({
      company_id: creator.whopCompanyId,
      use_case: 'account_onboarding',
      return_url: useHttps
        ? `${baseUrl}/creator/dashboard?onboarding=complete`
        : 'https://example.com/onboarding-complete',
      refresh_url: useHttps
        ? `${baseUrl}/creator/dashboard?onboarding=refresh`
        : 'https://example.com/onboarding-refresh',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('Onboarding link error:', error)
    return NextResponse.json(
      { error: 'Failed to generate onboarding link' },
      { status: 500 }
    )
  }
}
