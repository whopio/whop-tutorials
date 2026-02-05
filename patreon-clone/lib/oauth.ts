import crypto from 'crypto'

const isSandbox = process.env.WHOP_SANDBOX === 'true'
const API_BASE = isSandbox
  ? 'https://sandbox-api.whop.com'
  : 'https://api.whop.com'

const WHOP_AUTHORIZE_URL = `${API_BASE}/oauth/authorize`
const WHOP_TOKEN_URL = `${API_BASE}/oauth/token`
const WHOP_USERINFO_URL = `${API_BASE}/oauth/userinfo`

export function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  
  return { codeVerifier, codeChallenge }
}

export function generateState() {
  return crypto.randomBytes(16).toString('hex')
}

export function buildAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string
}) {
  const searchParams = new URLSearchParams({
    response_type: 'code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: 'openid profile email',
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    nonce: crypto.randomBytes(16).toString('hex'),
  })

  return `${WHOP_AUTHORIZE_URL}?${searchParams.toString()}`
}

export async function exchangeCodeForTokens(params: {
  code: string
  codeVerifier: string
  clientId: string
  redirectUri: string
}) {
  const response = await fetch(WHOP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      code_verifier: params.codeVerifier,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens')
  }

  return response.json() as Promise<{
    access_token: string
    refresh_token: string
    id_token?: string
    token_type: string
    expires_in: number
  }>
}

export async function fetchUserInfo(accessToken: string) {
  const response = await fetch(WHOP_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user info')
  }

  return response.json() as Promise<{
    sub: string // Whop user ID (user_xxxxxxxxxxxxx)
    name?: string
    preferred_username?: string
    picture?: string
    email?: string
    email_verified?: boolean
  }>
}