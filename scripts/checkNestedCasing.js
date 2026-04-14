const fs = require('fs');
const filePath = process.argv[2] || '/tmp/src_structure.txt';
let paths;
try {
  paths = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).filter(Boolean);
} catch (err) {
  console.error(`Error reading ${filePath}: ${err.message}`);
  process.exit(1);
}
const lowerToActual = new Map();
let mismatchCount = 0;

paths.forEach(p => {
  const lower = p.trim().toLowerCase();
  if (lowerToActual.has(lower) && lowerToActual.get(lower) !== p.trim()) {
    console.log(`CASING MISMATCH:`);
    console.log(`  Path 1: ${lowerToActual.get(lower)}`);
    console.log(`  Path 2: ${p.trim()}`);
    mismatchCount++;
  } else {
    lowerToActual.set(lower, p.trim());
  }
});

if (mismatchCount > 0) {
  console.log(`\nFound ${mismatchCount} casing mismatch(es).`);
  process.exit(1);
}
console.log('Nested casing check complete. No mismatches.');
