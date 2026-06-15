const fs = require('fs');
const files = [
  'src/screens/profile/PrivacyScreen.tsx',
  'src/screens/profile/TermsScreen.tsx',
  'src/screens/profile/ContactScreen.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/name="arrow-left&quot;/g, 'name="arrow-left"');
  fs.writeFileSync(file, content);
}
