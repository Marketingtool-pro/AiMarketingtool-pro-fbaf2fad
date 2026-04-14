#!/bin/bash

PROJECT_ROOT="/Users/loken/Developer/AiMarketingtool-pro-fbaf2fad"
DEST_TOOLS="$PROJECT_ROOT/src/assets/images/tool-icons-v2"

# Source Paths
SEO_DIR="/Users/loken/Developer/New Folder/3d-seo-marketing-icons_Njk4NjhlY2U1M2QwMGUwMDMzZGI0MzY3/3D Seo & Marketing Icons/PNG"
AI_DIR="/Users/loken/Developer/New Folder/3d-artificial-intelligence_Njk4NjhlY2U1M2QwMGUwMDMzZGI0MzY3/PNG"
MKT_DIR="/Users/loken/Developer/New Folder/3d-marketing_Njk4NjhlY2U1M2QwMGUwMDMzZGI0MzY3/PNG"

# Function to compress and move
rich_compress() {
    src="$1"
    dest_name="$2"
    echo "Processing $dest_name..."
    sips -s format png -z 128 128 "$src" --out "$DEST_TOOLS/$dest_name" > /dev/null
}

# 7 Platforms
rich_compress "$SEO_DIR/2 SEM.png" "google-3d.png"
rich_compress "$SEO_DIR/27 Advertisement.png" "meta-3d.png"
rich_compress "$SEO_DIR/22 Promotions.png" "social-media-3d.png"
rich_compress "$SEO_DIR/1 SEO.png" "seo-3d.png"
rich_compress "$SEO_DIR/11 Analytics.png" "analytics-3d.png"
rich_compress "$SEO_DIR/18 Landing Page.png" "ecommerce-3d.png"
rich_compress "$AI_DIR/1 a.png" "ai-3d.png"

# Onboarding (4 Slaps)
rich_compress "$AI_DIR/2 a.png" "onboarding-1.png"
rich_compress "$MKT_DIR/Icon-3.png" "onboarding-2.png"
rich_compress "$SEO_DIR/19 Marketing Strategy.png" "onboarding-3.png"
rich_compress "$MKT_DIR/Icon-23.png" "onboarding-4.png"

echo "Done!"
