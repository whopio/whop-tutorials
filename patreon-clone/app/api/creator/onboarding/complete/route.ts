import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { whop } from '@/lib/whop'

type VerificationProfile = { status?: string } | null

export async function POST() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
  })

  if (!creator || !creator.whopCompanyId) {
    return NextResponse.json(
      { error: 'Creator account not found' },
      { status: 404 }
    )
  }

  if (creator.whopOnboarded) {
    return NextResponse.json({ success: true, alreadyCompleted: true })
  }

  try {
    // Anyone can call this route, so ask Whop whether the creator's identity check passed
    const account = await whop.accounts.retrieve({ id: creator.whopCompanyId })
    const { individual, business } = account.verification as {
      individual?: VerificationProfile
      business?: VerificationProfile
    }

    if (individual?.status !== 'approved' && business?.status !== 'approved') {
      return NextResponse.json(
        { success: false, error: 'Verification is not approved yet' },
        { status: 409 }
      )
    }

    await prisma.creator.update({
      where: { id: creator.id },
      data: { whopOnboarded: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Onboarding completion error:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
