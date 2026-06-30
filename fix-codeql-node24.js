const fs = require('fs');
let code = fs.readFileSync('.github/workflows/codeql.yml', 'utf8');

// The deprecation warning says: To opt into Node.js 24 now, set the FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true environment variable on the runner or in your workflow file.
if (!code.includes('env:')) {
  code = code.replace(
    'jobs:\n  analyze:',
    `env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
  ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION: true

jobs:
  analyze:`
  );
}

fs.writeFileSync('.github/workflows/codeql.yml', code);
