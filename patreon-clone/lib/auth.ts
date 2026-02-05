import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { NextResponse } from 'next/server'
import { sessionOptions, SessionData, defaultSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function getSession() {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (!session.isLoggedIn) {
    return defaultSession
  }

  return session
}

export async function getCurrentUser() {
  const session = await getSession()

  if (!session.isLoggedIn || !session.userId) {
    return null
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
  })
}

export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  return { user, error: null }
}

export async function requireCreator() {
  const { user, error } = await requireAuth()

  if (error) {
    return { user: null, creator: null, error }
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: user!.id },
  })

  if (!creator) {
    return { user, creator: null, error: NextResponse.json({ error: 'Creator account not found' }, { status: 404 }) }
  }

  return { user, creator, error: null }
}
