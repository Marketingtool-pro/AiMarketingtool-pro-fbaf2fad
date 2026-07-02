const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const patchesDir = path.join(process.cwd(), 'patches');
const hasPatches = fs.existsSync(patchesDir) && fs.readdirSync(patchesDir).some((entry) => entry.endsWith('.patch'));

if (!hasPatches) {
  process.exit(0);
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['patch-package', '--error-on-fail=false'];

const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.warn(`patch-package could not be run: ${result.error.message}`);
  process.exit(0);
}

if (result.status && result.status !== 0) {
  console.warn('patch-package completed with non-zero exit status; continuing install.');
}

process.exit(0);
