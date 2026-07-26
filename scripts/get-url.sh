#!/usr/bin/env bash
# =============================================================================
# get-url.sh — Instantly fetch the live OpsTicket app URL
# Usage:
#   ./scripts/get-url.sh           → prints the URL
#   ./scripts/get-url.sh --open    → prints + opens it in the browser
# =============================================================================

set -euo pipefail

TERRAFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../terraform" && pwd)"

echo ""
echo "🔍 Fetching live app URL from Terraform state..."
echo ""

# Pull the URL directly from Terraform state (no AWS console needed)
APP_URL=$(terraform -chdir="$TERRAFORM_DIR" output -raw app_url 2>/dev/null)

if [[ -z "$APP_URL" ]]; then
  echo "❌ Could not retrieve URL. Make sure you have run 'terraform apply' at least once."
  echo "   Run: cd terraform && terraform output app_url"
  exit 1
fi

echo "┌─────────────────────────────────────────────────────────┐"
echo "│  🚀 OpsTicket is live!                                  │"
echo "│                                                         │"
printf  "│  %-55s │\n" "  App URL  : $APP_URL"
printf  "│  %-55s │\n" "  API URL  : $APP_URL/api"
printf  "│  %-55s │\n" "  Health   : $APP_URL/api/health"
echo "└─────────────────────────────────────────────────────────┘"
echo ""

# Copy URL to clipboard if xclip/pbcopy is available
if command -v xclip &>/dev/null; then
  echo "$APP_URL" | xclip -selection clipboard
  echo "📋 URL copied to clipboard (xclip)"
elif command -v pbcopy &>/dev/null; then
  echo "$APP_URL" | pbcopy
  echo "📋 URL copied to clipboard (pbcopy)"
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
