#!/bin/bash

# Kin Backend Test Script
# Usage: ./test-webhooks.sh [command]

set -e

BASE_URL="${BASE_URL:-http://localhost:3001}"

echo "🧪 Kin Backend Test Suite"
echo "=========================="
echo "Base URL: $BASE_URL"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function for HTTP requests
request() {
  local method=$1
  local endpoint=$2
  local data=$3
  local headers=$4

  echo -e "${YELLOW}→ $method $endpoint${NC}"
  
  if [ -n "$data" ]; then
    curl -s -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      ${headers:+-H "$headers"} \
      -d "$data" | jq . 2>/dev/null || echo "Raw response (not JSON)"
  else
    curl -s -X "$method" "$BASE_URL$endpoint" \
      ${headers:+-H "$headers"} | jq . 2>/dev/null || echo "Raw response (not JSON)"
  fi
  echo ""
}

# Health check
test_health() {
  echo -e "${GREEN}Testing Health Endpoint${NC}"
  request "GET" "/health"
}

# WhatsApp webhook verification
test_whatsapp_verify() {
  echo -e "${GREEN}Testing WhatsApp Webhook Verification${NC}"
  curl -s "$BASE_URL/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=kin-dev-token&hub.challenge=challenge_123"
  echo -e "\n"
}

# WhatsApp incoming message
test_whatsapp_message() {
  echo -e "${GREEN}Testing WhatsApp Incoming Message${NC}"
  request "POST" "/api/webhooks/whatsapp" '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "entry_123",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "1234567890",
            "phone_number_id": "phone_123"
          },
          "contacts": [{
            "wa_id": "1234567890",
            "profile": { "name": "Test User" }
          }],
          "messages": [{
            "from": "1234567890",
            "id": "msg_123",
            "timestamp": "'$(date +%s)'",
            "type": "text",
            "text": { "body": "Hello from test!" }
          }]
        },
        "field": "messages"
      }]
    }]
  }'
}

# Telegram incoming message
test_telegram_message() {
  echo -e "${GREEN}Testing Telegram Incoming Message${NC}"
  request "POST" "/api/webhooks/telegram" '{
    "update_id": 123,
    "message": {
      "message_id": 456,
      "from": {
        "id": 789,
        "is_bot": false,
        "first_name": "Test",
        "username": "testuser"
      },
      "chat": {
        "id": 789,
        "type": "private"
      },
      "date": '$(date +%s)',
      "text": "Hello from Telegram test!"
    }
  }'
}

# Telegram /start command
test_telegram_start() {
  echo -e "${GREEN}Testing Telegram /start Command${NC}"
  request "POST" "/api/webhooks/telegram" '{
    "update_id": 124,
    "message": {
      "message_id": 457,
      "from": {
        "id": 789,
        "is_bot": false,
        "first_name": "Test",
        "username": "testuser"
      },
      "chat": {
        "id": 789,
        "type": "private"
      },
      "date": '$(date +%s)',
      "text": "/start test_connection_token"
    }
  }'
}

# Connection endpoints (requires auth header)
test_connections() {
  echo -e "${GREEN}Testing Connection Endpoints${NC}"
  
  echo "WhatsApp Connection:"
  request "GET" "/api/connect/whatsapp" "" "x-clerk-user-id: test_user_123"
  
  echo "Telegram Connection:"
  request "GET" "/api/connect/telegram" "" "x-clerk-user-id: test_user_123"
  
  echo "User Connections:"
  request "GET" "/api/connections" "" "x-clerk-user-id: test_user_123"
}

# Send test message
test_send_message() {
  echo -e "${GREEN}Testing Send Message${NC}"
  request "POST" "/api/test/send" '{
    "platform": "whatsapp",
    "to": "1234567890",
    "message": "Test message from Kin backend!"
  }'
}

# Get webhook info
test_webhook_info() {
  echo -e "${GREEN}Testing Webhook Info${NC}"
  echo "WhatsApp:"
  request "GET" "/api/webhooks/whatsapp/info"
  
  echo "Telegram:"
  request "GET" "/api/webhooks/telegram/info"
}

# Run all tests
test_all() {
  test_health
  test_whatsapp_verify
  test_whatsapp_message
  sleep 1
  test_telegram_message
  sleep 1
  test_telegram_start
  test_connections
  test_webhook_info
}

# Main command handler
case "${1:-all}" in
  health)
    test_health
    ;;
  whatsapp-verify)
    test_whatsapp_verify
    ;;
  whatsapp-message)
    test_whatsapp_message
    ;;
  telegram-message)
    test_telegram_message
    ;;
  telegram-start)
    test_telegram_start
    ;;
  connections)
    test_connections
    ;;
  send)
    test_send_message
    ;;
  webhook-info)
    test_webhook_info
    ;;
  all)
    test_all
    ;;
  *)
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  health           - Test health endpoint"
    echo "  whatsapp-verify  - Test WhatsApp webhook verification"
    echo "  whatsapp-message - Test WhatsApp incoming message"
    echo "  telegram-message - Test Telegram incoming message"
    echo "  telegram-start   - Test Telegram /start command"
    echo "  connections      - Test connection endpoints"
    echo "  send             - Test sending a message"
    echo "  webhook-info     - Get webhook info"
    echo "  all              - Run all tests (default)"
    echo ""
    echo "Environment variables:"
    echo "  BASE_URL         - API base URL (default: http://localhost:3001)"
    exit 1
    ;;
esac

echo -e "${GREEN}✅ Tests completed!${NC}"