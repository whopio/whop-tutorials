import { NextResponse } from 'next/server'

const rateLimit = new Map<string, { count: number; lastReset: number }>()

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 20 // 20 requests per minute

export function checkRateLimit(identifier: string) {
  const now = Date.now()
  const record = rateLimit.get(identifier)

  if (!record || now - record.lastReset > WINDOW_MS) {
    rateLimit.set(identifier, { count: 1, lastReset: now })
    return { success: true, error: null }
  }

  if (record.count >= MAX_REQUESTS) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      ),
    }
  }

  record.count++
  return { success: true, error: null }
}
