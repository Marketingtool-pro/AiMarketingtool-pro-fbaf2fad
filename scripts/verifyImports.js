const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || '/tmp/files_to_check.txt';
let files;
try {
  files = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).filter(Boolean);
} catch (err) {
  console.error(`Error reading ${filePath}: ${err.message}`);
  process.exit(1);
}

let mismatchCount = 0;

files.forEach(fp => {
  let content;
  try { content = fs.readFileSync(fp, 'utf-8'); } catch { return; }
  const dir = path.dirname(fp);

  const matches = content.match(/from\s+['"](\..*?)['"]|require\(['"](\..*?)['"]\)/g);

  if (matches) {
    matches.forEach(m => {
      const match = m.match(/['"](\..*?)['"]/);
      if (!match) return;
      const importPath = match[1];
      const fullPath = path.resolve(dir, importPath);

      const exts = ['', '.ts', '.tsx', '.js', '.json', '.png', '.jpg', '.jpeg', '.webp'];

      for (const ext of exts) {
        const testPath = fullPath + ext;
        if (fs.existsSync(testPath)) {
          const actualDir = path.dirname(testPath);
          const base = path.basename(testPath);
          const filesInDir = fs.readdirSync(actualDir);

          if (!filesInDir.includes(base)) {
            const actualFile = filesInDir.find(f => f.toLowerCase() === base.toLowerCase());
            if (actualFile) {
              console.log(`CASING MISMATCH found in ${fp}:`);
              console.log(`  Imported: ${importPath}`);
              console.log(`  Expected: ${base}`);
              console.log(`  Actual: ${actualFile}`);
              mismatchCount++;
            }
          }
          break;
        }
      }
    });
  }
});

if (mismatchCount > 0) {
  console.log(`\nFound ${mismatchCount} casing mismatch(es).`);
  process.exit(1);
}
