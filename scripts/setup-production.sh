#!/usr/bin/env bash

set -euo pipefail

echo "Kin production setup"
echo ""
echo "This repo deploys as one Next.js app at: kin-saas/my-app"
echo "Canonical setup instructions are in: DEPLOYMENT.md"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to build locally."
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to build locally."
  exit 1
fi

echo "Installing dependencies and running a production build locally..."
cd "$(dirname "$0")/../kin-saas/my-app"
npm ci
npm run build

echo ""
echo "Local build passed."
echo "To deploy, use Vercel and set Root Directory to: kin-saas/my-app"
