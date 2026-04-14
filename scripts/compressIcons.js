const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconDirs = [
  'src/assets/images/tool-icons-v2',
  'src/assets/images/tool-icons'
];

async function compressIcons() {
  for (const dir of iconDirs) {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) continue;

    const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.png'));
    console.log(`Compressing ${files.length} icons in ${dir}...`);

    for (const file of files) {
      const filePath = path.join(fullPath, file);
      const webpPath = filePath.replace(/\.png$/i, '.webp');

      try {
        await sharp(filePath)
          .webp({ quality: 80, effort: 6 })
          .toFile(webpPath);

        // Only delete original if WebP was created successfully
        if (fs.existsSync(webpPath) && fs.statSync(webpPath).size > 0) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error(`Failed to compress ${file}:`, err.message);
      }
    }
  }
  console.log('Compression complete. WebP versions generated.');
}

compressIcons();
