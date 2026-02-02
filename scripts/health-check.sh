#!/bin/bash

# Quick health check script

echo "🏥 Kin SaaS Health Check"
echo "========================"

# Check if environment variables are set
echo ""
echo "Checking environment variables..."

required_vars=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "STRIPE_SECRET_KEY"
  "CLERK_SECRET_KEY"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ $var is not set"
  else
    echo "✓ $var is set"
  fi
done

# Check database connection
echo ""
echo "Checking database connection..."
curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_ANON_KEY" | grep -q "200" && echo "✓ Database reachable" || echo "❌ Database unreachable"

# Check Stripe connection
echo ""
echo "Checking Stripe connection..."
if command -v stripe > /dev/null; then
  stripe customers list --limit 1 > /dev/null 2>&1 && echo "✓ Stripe API reachable" || echo "❌ Stripe API unreachable"
else
  echo "⚠️  Stripe CLI not installed"
fi

echo ""
echo "========================"
echo "Health check complete!"
