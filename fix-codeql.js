const fs = require('fs');
let content = fs.readFileSync('.github/workflows/codeql.yml', 'utf8');
content = content.replace('        - language: java-kotlin\n          build-mode: none\n', '');
fs.writeFileSync('.github/workflows/codeql.yml', content);
