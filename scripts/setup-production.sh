#!/bin/bash

# Kin SaaS Production Setup Script
# Run this script to set up the production environment

set -e

echo "🚀 Kin SaaS Production Setup"
echo "=============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo ""
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "${RED}❌ Node.js version must be 18 or higher${NC}"
    exit 1
fi
echo "${GREEN}✓ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo "${GREEN}✓ npm $(npm -v)${NC}"

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "${YELLOW}⚠️  Supabase CLI not found. Installing...${NC}"
    npm install -g supabase
fi
echo "${GREEN}✓ Supabase CLI${NC}"

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi
echo "${GREEN}✓ Vercel CLI${NC}"

echo ""
echo "=============================="
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
cd kin && npm install
cd ../kin-backend && npm install
cd ..
echo "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo "=============================="
echo ""

# Environment setup
echo "🔧 Environment Configuration"

if [ ! -f .env.local ]; then
    echo "Creating .env.local from template..."
    cp .env.example .env.local
    echo "${YELLOW}⚠️  Please edit .env.local with your actual credentials${NC}"
else
    echo "${GREEN}✓ .env.local already exists${NC}"
fi

echo ""
echo "Required environment variables:"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo "  - STRIPE_SECRET_KEY"
echo "  - STRIPE_WEBHOOK_SECRET"
echo "  - CLERK_SECRET_KEY"
echo "  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"

echo ""
read -p "Have you configured all environment variables in .env.local? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "${YELLOW}Please configure environment variables and run this script again.${NC}"
    exit 0
fi

echo ""
echo "=============================="
echo ""

# Load environment variables
export $(grep -v '^#' .env.local | xargs)

# Database setup
echo "🗄️  Database Setup"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "${RED}❌ Supabase credentials not found in .env.local${NC}"
    exit 1
fi

echo "Running database migrations..."
supabase link --project-ref $(echo $SUPABASE_URL | cut -d'/' -f3 | cut -d'.' -f1)
supabase db push
echo "${GREEN}✓ Database migrations completed${NC}"

echo ""
echo "=============================="
echo ""

# Stripe setup
echo "💳 Stripe Configuration"

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "${RED}❌ Stripe secret key not found${NC}"
    exit 1
fi

echo "Checking Stripe CLI..."
if ! command -v stripe &> /dev/null; then
    echo "${YELLOW}⚠️  Stripe CLI not found. Install from: https://stripe.com/docs/stripe-cli${NC}"
else
    echo "${GREEN}✓ Stripe CLI found${NC}"
    
    # Test Stripe connection
    echo "Testing Stripe connection..."
    stripe customers list --limit 1 > /dev/null 2>&1 && echo "${GREEN}✓ Stripe connection successful${NC}"
fi

echo ""
echo "${YELLOW}Important: Configure these in your Stripe Dashboard:${NC}"
echo "  1. Create a Product 'Kin Pro' at $29/month"
echo "  2. Enable Customer Portal"
echo "  3. Add webhook endpoint: https://your-domain.com/api/webhooks/stripe"
echo "  4. Subscribe to events: checkout.session.completed, invoice.paid, etc."

echo ""
echo "=============================="
echo ""

# Build
echo "🔨 Building applications..."

echo "Building frontend..."
cd kin
npm run build
cd ..

echo "Building backend..."
cd kin-backend
npm run build
cd ..

echo "${GREEN}✓ Build completed${NC}"

echo ""
echo "=============================="
echo ""

# Vercel deployment
echo "🚀 Deployment"

echo "Deploying to Vercel..."
vercel --prod

echo ""
echo "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Configure your domain in Vercel"
echo "  2. Set up webhooks (Stripe, Clerk, Telegram)"
echo "  3. Test the application"
echo "  4. Monitor Sentry for errors"
echo ""
echo "Documentation:"
echo "  - API docs: API.md"
echo "  - Deployment guide: DEPLOYMENT.md"
echo ""
