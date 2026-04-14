const fs = require('fs');
const filePath = process.argv[2] || '/tmp/all_dirs.txt';
let dirs;
try {
  dirs = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).filter(Boolean);
} catch (err) {
  console.error(`Error reading ${filePath}: ${err.message}`);
  process.exit(1);
}
const lowerMap = new Map();
let dupeCount = 0;
dirs.forEach(d => {
  const lower = d.trim().toLowerCase();
  if (lowerMap.has(lower)) {
    console.log(`DUPLICATE DIRECTORY CASING DETECTED:`);
    console.log(`  1: ${lowerMap.get(lower)}`);
    console.log(`  2: ${d.trim()}`);
    dupeCount++;
  } else {
    lowerMap.set(lower, d.trim());
  }
});
if (dupeCount > 0) {
  console.log(`\nFound ${dupeCount} duplicate(s).`);
  process.exit(1);
}
