#!/usr/bin/env bash

set -euo pipefail

echo "OpenClaw Gateway setup (Ubuntu)"
echo ""

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This script is for Ubuntu/Linux servers only."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required."
  exit 1
fi

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required."
  exit 1
fi

echo "Installing system dependencies..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl git openssl

echo ""
echo "Installing OpenClaw..."
curl -fsSL https://openclaw.ai/install.sh | bash

if [[ -f "$HOME/.bashrc" ]]; then
  # shellcheck disable=SC1090
  source "$HOME/.bashrc" || true
fi

if ! command -v openclaw >/dev/null 2>&1; then
  if [[ -f "$HOME/.profile" ]]; then
    # shellcheck disable=SC1090
    source "$HOME/.profile" || true
  fi
fi

if ! command -v openclaw >/dev/null 2>&1; then
  echo "OpenClaw did not install correctly (openclaw not found on PATH)."
  echo "Log out and back in, then re-run this script."
  exit 1
fi

echo ""
echo "Configuring Gateway..."

GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
TOKEN="${OPENCLAW_GATEWAY_TOKEN:-$(openssl rand -hex 32)}"
DOMAIN="${OPENCLAW_DOMAIN:-}"

if [[ -n "${DOMAIN}" ]]; then
  echo "Domain provided: ${DOMAIN}"
  echo "Installing Caddy (HTTPS reverse proxy)..."
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y caddy

  # Keep OpenClaw private on the box; expose only via Caddy.
  openclaw config set gateway.bind loopback
  openclaw config set gateway.port "$GATEWAY_PORT"

  echo "Writing Caddy config..."
  sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
${DOMAIN} {
  reverse_proxy 127.0.0.1:${GATEWAY_PORT}
}
EOF
  sudo systemctl enable --now caddy
else
  # Quick test mode (no domain / no TLS). Exposes the port directly.
  openclaw config set gateway.bind lan
  openclaw config set gateway.port "$GATEWAY_PORT"
fi

# Require token auth.
openclaw config set gateway.auth.mode token
openclaw config set gateway.auth.token "$TOKEN"

# Enable the Chat Completions-compatible endpoint used by Kin.
openclaw config set gateway.http.endpoints.chatCompletions.enabled true

# Restrict tools for SaaS safety (start minimal).
# Allow only web_fetch by default. (web_search requires additional provider config.)
openclaw config set tools.allow '["web_fetch"]'
openclaw config set tools.deny '["group:runtime","group:fs","group:automation","group:nodes","browser","canvas","cron","gateway","exec","bash","process","write","edit","apply_patch"]'

echo ""
echo "Restarting Gateway..."

if command -v systemctl >/dev/null 2>&1; then
  # OpenClaw installs as a user service on Linux.
  systemctl --user daemon-reload || true
  systemctl --user restart openclaw-gateway || true
  systemctl --user --no-pager status openclaw-gateway || true
fi

PUBLIC_IP="$(curl -fsSL https://api.ipify.org || true)"
if [[ -z "${PUBLIC_IP}" ]]; then
  PUBLIC_IP="<YOUR_SERVER_IP>"
fi

echo ""
echo "Done."
echo ""
echo "Use these in Vercel:"
if [[ -n "${DOMAIN}" ]]; then
  echo "OPENCLAW_GATEWAY_URL=https://${DOMAIN}"
else
  echo "OPENCLAW_GATEWAY_URL=http://${PUBLIC_IP}:${GATEWAY_PORT}"
fi
echo "OPENCLAW_GATEWAY_TOKEN=${TOKEN}"
echo "OPENCLAW_AGENT_ID=main"
echo ""
echo "Health check URL:"
if [[ -n "${DOMAIN}" ]]; then
  echo "https://${DOMAIN}/v1/chat/completions"
else
  echo "http://${PUBLIC_IP}:${GATEWAY_PORT}/v1/chat/completions"
fi
