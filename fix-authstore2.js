const fs = require('fs');
let code = fs.readFileSync('src/store/authStore.ts', 'utf8');

// The vars are likely caught exceptions that are not used. 
// Standard ts/eslint fix: if the variable is unused, just remove it: `catch` instead of `catch (e)`
code = code.replace(/catch \(e: any\)/g, 'catch');
code = code.replace(/catch \(error: any\)/g, 'catch');
code = code.replace(/catch \(e\)/g, 'catch');
code = code.replace(/catch \(error\)/g, 'catch');

fs.writeFileSync('src/store/authStore.ts', code);
