const fs = require('fs');
let code = fs.readFileSync('.github/workflows/codeql.yml', 'utf8');

// The `java-kotlin` is back? Let's check.
// We tried to replace it earlier but the sed command failed or reverted.
// Actually, earlier the PR didn't get all the commits from Master.

if (code.includes('- language: java-kotlin')) {
  code = code.replace(
    /        - language: java-kotlin\n          build-mode: autobuild\n/g,
    ''
  );
  code = code.replace(
    /        - language: java-kotlin\n          build-mode: none\n/g,
    ''
  );
}

fs.writeFileSync('.github/workflows/codeql.yml', code);
