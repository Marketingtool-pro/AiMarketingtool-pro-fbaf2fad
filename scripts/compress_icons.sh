#!/bin/bash

PROJECT_ROOT="/Users/loken/Developer/AiMarketingtool-pro-fbaf2fad"
SOURCE_ROOT="/Users/loken/Pictures/New Folder"
DEST_SOCIAL="$PROJECT_ROOT/src/assets/images/social-icons"
DEST_TOOLS="$PROJECT_ROOT/src/assets/images/tool-icons-v2"

mkdir -p "$DEST_SOCIAL"
mkdir -p "$DEST_TOOLS"

echo "Processing Social Icons..."
# Glassify social icons are in a specific sub-directory
GLASSIFY_DIR=$(find "$SOURCE_ROOT" -maxdepth 1 -name "glassify-social-media-icons*" | head -n 1)
if [ -n "$GLASSIFY_DIR" ]; then
    find "$GLASSIFY_DIR" -name "*.png" | while read -r file; do
        filename=$(basename "$file")
        # Social icons are already named correctly (e.g. 01_Facebook.png)
        # sips -z 512 512 "$file" --out "$DEST_SOCIAL/$filename" > /dev/null
        # Use better compression for social icons
        sips -s format png -z 256 256 "$file" --out "$DEST_SOCIAL/$filename" > /dev/null
    done
fi

echo "Processing Tool Icons..."
# Exclude the social icons directory when searching for tools
find "$SOURCE_ROOT" -name "*.png" -not -path "*glassify-social-media-icons*" | while read -r file; do
    filename=$(basename "$file")
    
    # Skip icons that are too small or probably not main icons
    # (Optional: check size if needed)
    
    # Clean filename: lowercase, replace spaces with dashes, remove special chars
    new_filename=$(echo "$filename" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9._-]//g')
    
    # Resize to 256x256 for tools (enough for mobile app) and compress
    sips -s format png -z 256 256 "$file" --out "$DEST_TOOLS/$new_filename" > /dev/null
done

echo "Done!"
