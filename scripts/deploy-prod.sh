#!/bin/bash
# Deploy to production

set -e

echo "🚀 Deploying to Production"
echo "=========================="

# Verify we're on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Deploy must be from main branch (currently: $CURRENT_BRANCH)"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Uncommitted changes found. Commit or stash before deploying."
    exit 1
fi

# Get current version
VERSION=$(grep '"version"' package.json | head -1 | grep -o '[0-9.]*')
echo "📦 Current version: $VERSION"

# Verify environment file
if [ ! -f .env ]; then
    echo "❌ .env file not found. Copy .env.production and update with your values."
    exit 1
fi

echo "✓ Pre-flight checks passed"
echo ""

# Build and submit
echo "🔨 Building for production..."
eas build --platform all --profile production --non-interactive

echo ""
echo "📤 Submitting to App Stores..."
eas submit --platform all --profile production --non-interactive

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "Monitor progress:"
echo "  eas submissions"
echo "  eas submission:view <id>"
