#!/usr/bin/env bash
# =============================================================================
# get-url.sh — Instantly fetch the live OpsTicket app URL
# Usage:
#   ./scripts/get-url.sh           → prints the URL
#   ./scripts/get-url.sh --open    → prints + opens it in the browser
# =============================================================================

set -euo pipefail

echo ""
echo "🔍 Fetching live app URL from AWS..."
echo ""

# Query the ALB directly via AWS CLI — no terraform wrapper issues
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names opsticket-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text 2>/dev/null || echo "")

if [[ -z "$ALB_DNS" || "$ALB_DNS" == "None" ]]; then
  echo "❌ ALB 'opsticket-alb' not found."
  echo "   Make sure you have run 'terraform apply' at least once."
  echo "   Hint: cd terraform && terraform apply -auto-approve"
  exit 1
fi

APP_URL="http://$ALB_DNS"

echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  🚀 OpsTicket is live!                                      │"
echo "│                                                             │"
printf  "│  App URL  : %-47s │\n" "$APP_URL"
printf  "│  API URL  : %-47s │\n" "$APP_URL/api"
printf  "│  Health   : %-47s │\n" "$APP_URL/api/health"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

# Copy URL to clipboard if xclip/pbcopy is available
if command -v xclip &>/dev/null; then
  echo "$APP_URL" | xclip -selection clipboard
  echo "📋 URL copied to clipboard"
elif command -v pbcopy &>/dev/null; then
  echo "$APP_URL" | pbcopy
  echo "📋 URL copied to clipboard"
fi

# Open in browser if --open flag is passed
if [[ "${1:-}" == "--open" ]]; then
  echo "🌐 Opening in browser..."
  if command -v xdg-open &>/dev/null; then
    xdg-open "$APP_URL"
  elif command -v open &>/dev/null; then
    open "$APP_URL"
  else
    echo "⚠️  Could not detect a browser opener. Visit: $APP_URL"
  fi
fi
