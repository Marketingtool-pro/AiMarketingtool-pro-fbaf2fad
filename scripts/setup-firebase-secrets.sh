#!/bin/bash
# Setup Firebase Secret Manager secrets required for Cloud Functions
# Run this once before deploying functions

PROJECT="marketing-tool-484720"

echo "🔑 Setting up Firebase Secret Manager for project: $PROJECT"
echo ""
echo "Required secrets:"
echo "  - GOOGLE_GENAI_API_KEY (Google AI Studio API key for Gemini)"
echo ""
echo "Get your Gemini API key at: https://aistudio.google.com/app/apikey"
echo ""

# Set GOOGLE_GENAI_API_KEY
echo -n "Enter your GOOGLE_GENAI_API_KEY (from AI Studio): "
read -s GENAI_KEY
echo ""

if [ -z "$GENAI_KEY" ]; then
  echo "❌ No key provided. Exiting."
  exit 1
fi

echo "Creating secret in GCP Secret Manager..."
firebase functions:secrets:set GOOGLE_GENAI_API_KEY --project "$PROJECT" <<< "$GENAI_KEY"

echo ""
echo "✅ Firebase secrets set! You can now deploy functions:"
echo "   cd functions && npm run build && firebase deploy --only functions"
