#!/usr/bin/env bash
# Test Create DM channel (same as whop-channel route). Requires dms:channel:manage.
# Usage: ./scripts/test-whop-dm-channel.sh
# Set WHOP_APP_API_KEY or WHOP_API_KEY in .env.local (or export here).

set -e
cd "$(dirname "$0")/.."
source .env.local 2>/dev/null || true

API_KEY="${WHOP_APP_API_KEY:-$WHOP_API_KEY}"
if [ -z "$API_KEY" ]; then
  echo "Set WHOP_APP_API_KEY or WHOP_API_KEY (e.g. in .env.local)"
  exit 1
fi

# Pass real Whop user IDs (user_xxxxxxxxxxxx) as args. Optional COMPANY_ID for company-scoped DM.
# Usage: ./scripts/test-whop-dm-channel.sh <buyer_whop_id> <seller_whop_id> [company_id]
BUYER_WHOP_ID="${1:?buyer Whop user_id required (user_xxxxxxxxxxxx)}"
SELLER_WHOP_ID="${2:?seller Whop user_id required (user_xxxxxxxxxxxx)}"
COMPANY_ID="${3:-}"  # optional biz_xxx

BODY="{\"with_user_ids\": [\"$BUYER_WHOP_ID\", \"$SELLER_WHOP_ID\"], \"custom_name\": \"Gig conversation\"}"
if [ -n "$COMPANY_ID" ]; then
  BODY="{\"with_user_ids\": [\"$BUYER_WHOP_ID\", \"$SELLER_WHOP_ID\"], \"company_id\": \"$COMPANY_ID\", \"custom_name\": \"Gig conversation\"}"
fi

echo "POST https://api.whop.com/api/v1/dm_channels"
echo "with_user_ids: $BUYER_WHOP_ID, $SELLER_WHOP_ID"
curl -s -X POST "https://api.whop.com/api/v1/dm_channels" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$BODY" | jq .
