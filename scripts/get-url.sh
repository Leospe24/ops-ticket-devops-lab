#!/usr/bin/env bash
# =============================================================================
# get-url.sh — Instantly fetch the live OpsTicket app URL
#
# Usage:
#   ./scripts/get-url.sh              → prints the URL
#   ./scripts/get-url.sh --open       → prints + opens in browser
#   ./scripts/get-url.sh --set <url>  → manually save a URL to local cache
#
# URL resolution order:
#   1. terraform output (works locally — no AWS creds needed)
#   2. AWS CLI query    (works in CI or with local AWS profile)
#   3. Cached .opsticket-url file
#   4. Friendly error with --set instructions
# =============================================================================

set -euo pipefail

CACHE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.opsticket-url"

# --set <url>: manually cache a URL (useful when AWS CLI isn't configured locally)
if [[ "${1:-}" == "--set" && -n "${2:-}" ]]; then
  echo "${2}" > "$CACHE_FILE"
  echo "✅ URL saved to cache: ${2}"
  echo "   Run './scripts/get-url.sh --open' to open it."
  exit 0
fi

echo ""
echo "🔍 Fetching live app URL..."
echo ""

APP_URL=""
TERRAFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/terraform"

# Strategy 1: terraform output — works locally without any AWS credentials
# since state is already stored in S3 and init was already run.
if command -v terraform &>/dev/null && [[ -d "$TERRAFORM_DIR/.terraform" ]]; then
  TF_OUT=$(terraform -chdir="$TERRAFORM_DIR" output -raw app_url 2>/dev/null || echo "")
  if [[ -n "$TF_OUT" && "$TF_OUT" != *"No outputs found"* ]]; then
    APP_URL="$TF_OUT"
    echo "$APP_URL" > "$CACHE_FILE"   # refresh cache
  fi
fi

# Strategy 2: AWS CLI (works in CI / when a local AWS profile is configured)
# Region must be explicit — profile may not have a default region set.
if [[ -z "$APP_URL" ]] && command -v aws &>/dev/null; then
  ALB_DNS=$(aws elbv2 describe-load-balancers \
    --region us-east-1 \
    --names opsticket-alb \
    --query 'LoadBalancers[0].DNSName' \
    --output text 2>/dev/null || echo "")
  if [[ -n "$ALB_DNS" && "$ALB_DNS" != "None" ]]; then
    APP_URL="http://$ALB_DNS"
    echo "$APP_URL" > "$CACHE_FILE"   # refresh cache
  fi
fi

# Strategy 2: Fall back to cached URL
if [[ -z "$APP_URL" && -f "$CACHE_FILE" ]]; then
  APP_URL=$(cat "$CACHE_FILE")
  echo "⚠️  AWS CLI not available or no credentials — using cached URL."
  echo "   To refresh: configure AWS credentials and re-run this script."
  echo ""
fi

# Strategy 3: Give up with clear instructions
if [[ -z "$APP_URL" ]]; then
  echo "❌ Could not determine the app URL."
  echo ""
  echo "   Option A — Set it manually (paste from GitHub Actions summary):"
  echo "   ./scripts/get-url.sh --set http://opsticket-alb-xxxx.us-east-1.elb.amazonaws.com"
  echo ""
  echo "   Option B — Configure AWS CLI credentials then re-run:"
  echo "   aws configure  (or set AWS_PROFILE)"
  echo ""
  exit 1
fi

echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│  🚀 OpsTicket is live!                                          │"
echo "│                                                                 │"
printf  "│  🌐 App    : %-51s │\n" "$APP_URL"
printf  "│  🔌 API    : %-51s │\n" "$APP_URL/api"
printf  "│  ❤️  Health : %-51s │\n" "$APP_URL/api/health"
echo "└─────────────────────────────────────────────────────────────────┘"
echo ""

# Copy URL to clipboard if available
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
