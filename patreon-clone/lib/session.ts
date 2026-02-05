import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId?: string
  whopUserId?: string
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'patreon-clone-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
}