const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const projectPath = 'src';

try {
  const gitFiles = execSync('git ls-files ' + projectPath, { encoding: 'utf-8', cwd: repoRoot })
    .split('\n')
    .filter(Boolean);

  gitFiles.forEach(gitFile => {
    const fullPath = path.join(repoRoot, gitFile);
    if (fs.existsSync(fullPath)) {
      const dir = path.dirname(fullPath);
      const base = path.basename(fullPath);
      const actualFiles = fs.readdirSync(dir);
      
      if (!actualFiles.includes(base)) {
        const match = actualFiles.find(f => f.toLowerCase() === base.toLowerCase());
        if (match) {
          console.log(`GIT INDEX MISMATCH:`);
          console.log(`  In Git: ${gitFile}`);
          console.log(`  On Disk: ${match} (in ${dir})`);
        }
      }
    }
  });
  console.log('Git index check complete.');
} catch (err) {
  console.error('Error running git command:', err.message);
}
