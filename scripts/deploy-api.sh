#!/bin/bash

# Makerlog.ai API Deployment Script
# This script helps deploy the API worker safely

set -e

echo "🚀 Makerlog.ai API Deployment Script"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "workers/api/wrangler.toml" ]; then
    echo -e "${RED}Error: Must run from project root${NC}"
    echo "Please run this script from: /home/eileen/projects/makerlog-ai"
    exit 1
fi

# Navigate to worker directory
cd workers/api

# Check current worker status
echo "📋 Checking current deployment status..."
echo ""

# Try to get current worker info
echo "Current worker configuration:"
cat wrangler.toml | grep -E "^name |^routes"
echo ""

# Check for route conflicts
echo "🔍 Checking for route conflicts..."
DEPLOY_OUTPUT=$(wrangler deploy --dry-run 2>&1 || true)

if echo "$DEPLOY_OUTPUT" | grep -q "already assigned to another worker"; then
    echo -e "${YELLOW}⚠️  WARNING: Route conflict detected!${NC}"
    echo ""
    echo "The following error was found:"
    echo "$DEPLOY_OUTPUT" | grep -A3 "already assigned"
    echo ""
    echo -e "${RED}ACTION REQUIRED:${NC}"
    echo "1. Go to Cloudflare Dashboard:"
    echo "   https://dash.cloudflare.com/049ff5e84ecf636b53b162cbb580aae6/workers/overview"
    echo ""
    echo "2. Find the worker that's using 'api.makerlog.ai/*'"
    echo "3. Remove that route from the old worker"
    echo "4. Run this script again"
    echo ""
    echo "Alternatively, you can:"
    echo "- Delete the conflicting worker (if it's no longer needed)"
    echo "- Use a different route in wrangler.toml"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ No route conflicts detected${NC}"
echo ""

# Confirm deployment
read -p "Deploy worker to production? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Deploy
echo "🚀 Deploying worker..."
echo ""

if wrangler deploy; then
    echo ""
    echo -e "${GREEN}✓ Deployment successful!${NC}"
    echo ""
    echo "Testing deployment..."
    echo ""

    # Test health endpoint
    HEALTH_CHECK=$(curl -s https://api.makerlog.ai/ 2>&1 || echo "Failed")
    if echo "$HEALTH_CHECK" | grep -q "makerlog-api"; then
        echo -e "${GREEN}✓ Health endpoint responding${NC}"
        echo "Response: $HEALTH_CHECK"
    else
        echo -e "${YELLOW}⚠️  Health endpoint not responding yet${NC}"
        echo "This may take a minute to propagate..."
    fi

    echo ""
    echo "🎉 Deployment complete!"
    echo ""
    echo "Next steps:"
    echo "1. Test the upload-chunk endpoint"
    echo "2. Test the transcribe endpoint"
    echo "3. Verify audio files appear in R2 bucket"
else
    echo ""
    echo -e "${RED}✗ Deployment failed${NC}"
    echo "Please check the error messages above"
    exit 1
fi
