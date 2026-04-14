const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2] || path.resolve(__dirname, '../src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function checkImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const importRegex = /import\s+.*\s+from\s+['"](.*)['"]/g;
  const requireRegex = /require\(['"](.*)['"]\)/g;
  let match;

  const currentDir = path.dirname(filePath);

  const processImport = (importPath) => {
    if (importPath.startsWith('.')) {
      let fullPath = path.resolve(currentDir, importPath);
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
      
      let found = false;
      let actualCasing = '';

      for (const ext of extensions) {
        const testPath = fullPath + ext;
        if (fs.existsSync(testPath)) {
          const dir = path.dirname(testPath);
          const base = path.basename(testPath);
          const filesInDir = fs.readdirSync(dir);
          
          if (filesInDir.includes(base)) {
            found = true;
            break;
          } else {
            const match = filesInDir.find(f => f.toLowerCase() === base.toLowerCase());
            if (match) {
              console.log(`Casing mismatch in ${filePath}:`);
              console.log(`  Imported: ${importPath}`);
              console.log(`  Actual file: ${match} (in ${dir})`);
              found = true;
            }
          }
        }
      }
    }
  };

  while ((match = importRegex.exec(content)) !== null) processImport(match[1]);
  while ((match = requireRegex.exec(content)) !== null) processImport(match[1]);
}

const allFiles = getAllFiles(rootDir);
allFiles.forEach(checkImports);
console.log('Casing check complete.');
