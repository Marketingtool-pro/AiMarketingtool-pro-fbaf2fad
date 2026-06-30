const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.private) {
  console.log("It had private: true");
  delete pkg.private;
} else {
  console.log("It did not have private: true");
}
// Maybe remove publishConfig.access ?
if (pkg.publishConfig && pkg.publishConfig.access) {
  // delete pkg.publishConfig.access;
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
