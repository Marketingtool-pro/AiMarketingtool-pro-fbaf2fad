#!/bin/bash
# Local deployment setup script

set -e

echo "🚀 Marketing AI - Deployment Setup"
echo "===================================="

# Check prerequisites
echo "✓ Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "❌ Node.js not installed"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm not installed"; exit 1; }

echo "✓ Node.js and npm found"

# Check for EAS CLI
if ! command -v eas &> /dev/null; then
    echo "📦 Installing EAS CLI..."
    npm install -g eas-cli
fi

# Install dependencies
echo "📦 Installing project dependencies..."
npm ci

# Create environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env || cp .env.production .env
    echo "⚠️  Update .env with your actual values before deploying!"
fi

# Initialize EAS
if [ ! -f eas.json ]; then
    echo "⚙️  Initializing EAS configuration..."
    eas build:configure
else
    echo "✓ EAS configuration found"
fi

# Check GitHub actions
if [ -d .github/workflows ]; then
    echo "✓ GitHub Actions workflows found"
    echo "   - build-and-test.yml"
    echo "   - production-deploy.yml"
    echo "   - code-quality.yml"
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your production values"
echo "2. Run 'eas credentials' to configure iOS/Android signing"
echo "3. Add GitHub secrets: EXPO_TOKEN, APPLE_APP_SPECIFIC_PASSWORD"
echo "4. Push to GitHub to trigger CI/CD pipelines"
echo ""
echo "Useful commands:"
echo "  eas build --platform all --profile preview     # Build preview"
echo "  eas build --platform all --profile production  # Build for stores"
echo "  eas submit --platform all --profile production # Submit to stores"
echo "  eas submissions                                 # View submission status"
echo ""
