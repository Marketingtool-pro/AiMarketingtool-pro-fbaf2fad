#!/bin/bash

PROJECT_ROOT="/Users/loken/Developer/AiMarketingtool-pro-fbaf2fad"
SOURCE_ROOT="/Users/loken/Pictures/New Folder"
DEST_SOCIAL="$PROJECT_ROOT/src/assets/images/social-icons"
DEST_TOOLS="$PROJECT_ROOT/src/assets/images/tool-icons-v2"

mkdir -p "$DEST_SOCIAL"
mkdir -p "$DEST_TOOLS"

echo "Compressing Social Icons (128x128)..."
GLASSIFY_DIR=$(find "$SOURCE_ROOT" -maxdepth 1 -name "glassify-social-media-icons*" | head -n 1)
if [ -n "$GLASSIFY_DIR" ]; then
    find "$GLASSIFY_DIR" -name "*.png" | while read -r file; do
        filename=$(basename "$file")
        sips -s format png -z 128 128 "$file" --out "$DEST_SOCIAL/$filename" > /dev/null
    done
fi

echo "Compressing Tool Icons (128x128)..."
# Exclude the social icons directory when searching for tools
find "$SOURCE_ROOT" -name "*.png" -not -path "*glassify-social-media-icons*" | while read -r file; do
    filename=$(basename "$file")
    new_filename=$(echo "$filename" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9._-]//g')
    
    # Check if file exists and is not too large before sips
    if [ -f "$file" ]; then
        sips -s format png -z 128 128 "$file" --out "$DEST_TOOLS/$new_filename" > /dev/null
    fi
done

echo "Done!"
