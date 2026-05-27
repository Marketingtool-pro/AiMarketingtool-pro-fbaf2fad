#!/bin/bash
# Capture iPad screenshots for App Store Connect
# Required dimensions: 2064×2752px or 2732×2048px

DEVICE_ID="19B86174-29FE-46A3-BB8A-5EBC98860AD8"  # iPad Pro 13-inch (M4)
OUTPUT_DIR="/Users/anshsingh/Desktop/Developer/AiMarketingtool-pro-fbaf2fad/app-store-screenshots"

mkdir -p "$OUTPUT_DIR"

echo "📸 Capturing iPad screenshots for App Store Connect..."
echo "📱 Using device: iPad Pro 13-inch (M4)"
echo "📁 Saving to: $OUTPUT_DIR"
echo ""
echo "⏸️  Please navigate to each screen in the simulator and press ENTER"
echo ""

# Screenshot 1: Home/Dashboard
read -p "1️⃣  Navigate to Home/Dashboard screen, then press ENTER..."
xcrun simctl io "$DEVICE_ID" screenshot --type=png "$OUTPUT_DIR/01-dashboard.png"
echo "✅ Saved: 01-dashboard.png"

# Screenshot 2: Tools catalog
read -p "2️⃣  Navigate to Tools screen, then press ENTER..."
xcrun simctl io "$DEVICE_ID" screenshot --type=png "$OUTPUT_DIR/02-tools.png"
echo "✅ Saved: 02-tools.png"

# Screenshot 3: AI Chat
read -p "3️⃣  Navigate to AI Chat screen, then press ENTER..."
xcrun simctl io "$DEVICE_ID" screenshot --type=png "$OUTPUT_DIR/03-chat.png"
echo "✅ Saved: 03-chat.png"

# Screenshot 4: Tool execution/result
read -p "4️⃣  Show a tool execution or result, then press ENTER..."
xcrun simctl io "$DEVICE_ID" screenshot --type=png "$OUTPUT_DIR/04-tool-result.png"
echo "✅ Saved: 04-tool-result.png"

# Screenshot 5: Profile or settings
read -p "5️⃣  Navigate to Profile/Settings screen, then press ENTER..."
xcrun simctl io "$DEVICE_ID" screenshot --type=png "$OUTPUT_DIR/05-profile.png"
echo "✅ Saved: 05-profile.png"

echo ""
echo "✅ Captured 5 iPad screenshots!"
echo ""
echo "📊 Checking dimensions..."
for img in "$OUTPUT_DIR"/*.png; do
    if [ -f "$img" ]; then
        size=$(sips -g pixelWidth -g pixelHeight "$img" | awk '/pixelWidth|pixelHeight/ {print $2}' | paste -sd 'x' -)
        echo "  $(basename "$img"): $size"
    fi
done

echo ""
echo "📤 Next steps:"
echo "  1. Upload these screenshots to App Store Connect"
echo "  2. Go to: iPad tab → 13\" Display section"
echo "  3. Upload at least 1 screenshot (up to 10)"
echo "  4. Click 'Add for Review' to resubmit"
