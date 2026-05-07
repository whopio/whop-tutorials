#!/usr/bin/env node
/**
 * Manual check: fetch whop_company_id from seller_accounts and call Whop ledger API.
 * Run: node scripts/check-whop-kyc.js
 * Requires .env.local with WHOP_API_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 */

const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const WHOP_API_KEY = process.env.WHOP_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!WHOP_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing .env.local vars: WHOP_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function main() {
  // 1. Get all seller_accounts with whop_company_id
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/seller_accounts?select=id,user_id,whop_company_id,kyc_status`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const sellers = await res.json();
  console.log('Sellers in DB:', sellers.length);
  if (sellers.length === 0) {
    console.log('No sellers. Create one via Get Started on /sell/onboarding');
    return;
  }

  for (const s of sellers) {
    console.log('\n---', s.user_id, '| whop_company_id:', s.whop_company_id || '(none)', '| kyc_status:', s.kyc_status);
    if (!s.whop_company_id) {
      console.log('  Skip: no whop_company_id (user needs to click Get Started first)');
      continue;
    }

    // 2. Call Whop ledger API
    const ledgerRes = await fetch(
      `https://api.whop.com/api/v1/ledger_accounts/${s.whop_company_id}`,
      {
        headers: { Authorization: `Bearer ${WHOP_API_KEY}` },
      }
    );

    if (!ledgerRes.ok) {
      console.log('  Whop API error:', ledgerRes.status, await ledgerRes.text());
      continue;
    }

    const ledger = await ledgerRes.json();
    const payout = ledger.payout_account_details;
    const ver = payout?.latest_verification;

    console.log('  payout_account_details:', payout ? 'present' : 'null');
    console.log('  latest_verification.status:', ver?.status ?? '(none)');
    console.log('  verified:', ver?.status === 'verified');
  }
}

main().catch(console.error);
