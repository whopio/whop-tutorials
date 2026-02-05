import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const { creator, error } = await requireCreator()
  if (error) return error

  if (creator.whopOnboarded) {
    return NextResponse.json({ success: true, alreadyCompleted: true })
  }

  try {
    // Update the creator's onboarding status
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
