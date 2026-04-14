const fs = require('fs');
const path = require('path');

const iconDirs = [
  'src/assets/images/tool-icons-v2',
  'src/assets/images/tool-icons'
];

const outputFile = path.join(__dirname, '../src/constants/toolIcons.ts');

const mapping = {};
let totalIcons = 0;

iconDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) return;

  const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.png') || f.endsWith('.webp'));
  files.forEach(file => {
    const name = path.parse(file).name;
    const ext = path.parse(file).ext;
    
    // If we have both webp and png, prefer webp
    if (ext === '.webp' || !mapping[name]) {
      mapping[name] = `require('../assets/images/${path.basename(dir)}/${file}')`;
      totalIcons++;
    }
  });
});

const content = `// Auto-generated tool icon mapping — ${totalIcons} icons
const ToolIconImages: Record<string, any> = {
${Object.entries(mapping).map(([name, req]) => `  '${name}': ${req},`).join('\n')}
};

const DEFAULT_ICON = require('../assets/images/tool-icons-v2/6-marketing-strategy.png');

export function getToolIcon(slug: string, category?: string): any {
  if (ToolIconImages[slug]) return ToolIconImages[slug];
  if (category && ToolIconImages[category]) return ToolIconImages[category];
  const parts = slug.split('-');
  for (const key of Object.keys(ToolIconImages)) {
    if (parts.some(p => p.length > 3 && key.includes(p))) return ToolIconImages[key];
  }
  return DEFAULT_ICON;
}
`;

fs.writeFileSync(outputFile, content);
console.log(`Generated mapping for ${totalIcons} icons to ${outputFile}`);
