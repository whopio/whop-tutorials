#!/usr/bin/env node
/**
 * Fetch the Whop app by WHOP_OAUTH_CLIENT_ID and print api_key.token (use as WHOP_OAUTH_CLIENT_SECRET if Whop accepts it for OAuth).
 * Run: node scripts/get-whop-oauth-secret.js
 * Requires .env.local: WHOP_API_KEY, WHOP_OAUTH_CLIENT_ID
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
const WHOP_OAUTH_CLIENT_ID = process.env.WHOP_OAUTH_CLIENT_ID;

if (!WHOP_API_KEY || !WHOP_OAUTH_CLIENT_ID) {
  console.error('Missing WHOP_API_KEY or WHOP_OAUTH_CLIENT_ID in .env.local');
  process.exit(1);
}

async function main() {
  const Whop = (await import('@whop/sdk')).default;
  const whop = new Whop({ apiKey: WHOP_API_KEY });
  const app = await whop.apps.retrieve(WHOP_OAUTH_CLIENT_ID);

  console.log('App id:', app.id);
  console.log('Redirect URIs:', app.redirect_uris);
  if (app.api_key?.token) {
    console.log('\nUse this as WHOP_OAUTH_CLIENT_SECRET in .env.local:');
    console.log('WHOP_OAUTH_CLIENT_SECRET=' + app.api_key.token);
  } else {
    console.log('\nNo api_key on this app. In Whop Dashboard → Developer → your app, generate an API key or copy the OAuth Client secret.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
