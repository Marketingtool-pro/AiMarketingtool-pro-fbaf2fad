const fs = require('fs');
let code = fs.readFileSync('src/services/googleAdsAgent.ts', 'utf8');

code = code.replace(
  "import gcpAuthService from './gcpAuthService';",
  "import { gcpAuthService } from './gcpAuthService';" // Assuming it's a named export, since the warning says "Using exported name 'gcpAuthService' as identifier for default import"
);

fs.writeFileSync('src/services/googleAdsAgent.ts', code);
