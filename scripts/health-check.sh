#!/bin/bash

# Quick health check script

echo "Kin Health Check"
echo "================"

# Check if environment variables are set
echo ""
echo "Checking environment variables..."

required_vars=(
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "STRIPE_PRICE_ID"
  "TELEGRAM_BOT_TOKEN"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ $var is not set"
  else
    echo "✓ $var is set"
  fi
done

# AI key: allow either name.
if [ -n "${MOONSHOT_API_KEY}" ] || [ -n "${KIN_AI_API_KEY}" ]; then
  echo "✓ AI key is set"
else
  echo "❌ AI key is not set (MOONSHOT_API_KEY or KIN_AI_API_KEY)"
fi

# Check database connection
echo ""
echo "Checking database connection..."
curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_ANON_KEY" | grep -q "200" && echo "✓ Database reachable" || echo "❌ Database unreachable"

echo ""
echo "========================"
echo "Health check complete!"
