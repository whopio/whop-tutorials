#!/usr/bin/env node
/**
 * Create or update the Whop OAuth app via API so redirect URIs and config are under our control.
 * Run: node scripts/create-whop-oauth-app.js
 *
 * Requires .env.local:
 *   - WHOP_API_KEY (API key with developer:create_app, developer:manage_api_key; for update: developer:update_app)
 *   - WHOP_PLATFORM_COMPANY_ID (biz_xxx – company to create the app under)
 *
 * Optional .env.local (for update-only or to prefill):
 *   - WHOP_OAUTH_CLIENT_ID – if set, we update this app's redirect_uris instead of creating new
 *   - NEXT_PUBLIC_APP_URL – base URL for redirect (default http://localhost:3000)
 *
 * Output: env vars to add to .env.local (WHOP_OAUTH_CLIENT_ID, WHOP_OAUTH_CLIENT_SECRET if returned).
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    });
}

const WHOP_API_KEY = process.env.WHOP_API_KEY;
const WHOP_PLATFORM_COMPANY_ID = process.env.WHOP_PLATFORM_COMPANY_ID;
const WHOP_OAUTH_CLIENT_ID = process.env.WHOP_OAUTH_CLIENT_ID;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const redirectUris = [
  `${NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/auth/callback/whop`,
  'http://localhost:3000/api/auth/callback/whop',
  'https://localhost:3000/api/auth/callback/whop',
]
  .filter((u, i, a) => a.indexOf(u) === i);

if (!WHOP_API_KEY) {
  console.error('Missing WHOP_API_KEY in .env.local');
  process.exit(1);
}

async function main() {
  const Whop = (await import('@whop/sdk')).default;
  const whop = new Whop({ apiKey: WHOP_API_KEY });

  if (WHOP_OAUTH_CLIENT_ID) {
    // Update existing app: set redirect URIs (and optional base_url)
    console.log('Updating existing app:', WHOP_OAUTH_CLIENT_ID);
    const app = await whop.apps.update(WHOP_OAUTH_CLIENT_ID, {
      redirect_uris: redirectUris,
      base_url: NEXT_PUBLIC_APP_URL.replace(/\/$/, '') || null,
    });
    console.log('Updated redirect_uris:', app.redirect_uris);
    console.log('\nAdd to .env.local (client_id unchanged):');
    console.log('WHOP_OAUTH_CLIENT_ID=' + app.id);
    if (app.api_key?.token) {
      console.log('WHOP_OAUTH_CLIENT_SECRET=' + app.api_key.token);
    } else {
      console.log('# WHOP_OAUTH_CLIENT_SECRET=... (copy from Whop Dashboard → Developer → your app)');
    }
    console.log('NEXT_PUBLIC_WHOP_OAUTH_REDIRECT_URI=' + redirectUris[0]);
    return;
  }

  // Create new app (requires company_id)
  if (!WHOP_PLATFORM_COMPANY_ID) {
    console.error('For create: set WHOP_PLATFORM_COMPANY_ID in .env.local (biz_xxx company to create app under).');
    console.error('Or set WHOP_OAUTH_CLIENT_ID to update an existing app instead.');
    process.exit(1);
  }

  const app = await whop.apps.create({
    company_id: WHOP_PLATFORM_COMPANY_ID,
    name: 'GigFlow OAuth',
    redirect_uris: redirectUris,
    base_url: NEXT_PUBLIC_APP_URL.replace(/\/$/, '') || null,
  });

  console.log('Created app:', app.id);
  console.log('Redirect URIs:', app.redirect_uris);
  console.log('\nAdd to .env.local:');
  console.log('WHOP_OAUTH_CLIENT_ID=' + app.id);
  if (app.api_key?.token) {
    console.log('WHOP_OAUTH_CLIENT_SECRET=' + app.api_key.token);
  } else {
    console.log('# WHOP_OAUTH_CLIENT_SECRET=... (generate in Whop Dashboard → Developer → your app, or use API if available)');
  }
  console.log('NEXT_PUBLIC_WHOP_OAUTH_REDIRECT_URI=' + (redirectUris[0] || app.redirect_uris[0]));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
