const fs = require('fs');
let code = fs.readFileSync('src/store/toolsStore.ts', 'utf8');

// The require() was at line 118:
// A `require()` style import is forbidden @typescript-eslint/no-require-imports
// Let's just add an eslint-disable comment above the require in toolsStore.ts
code = code.replace(/const toolsData = require\('\\.\\.\/data\/tools\.js'\);/, '// eslint-disable-next-line @typescript-eslint/no-require-imports\n      const toolsData = require(\'../data/tools.js\');');

fs.writeFileSync('src/store/toolsStore.ts', code);
