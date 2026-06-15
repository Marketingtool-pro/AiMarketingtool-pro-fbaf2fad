const fs = require('fs');
const files = [
  'src/screens/profile/PrivacyScreen.tsx',
  'src/screens/profile/TermsScreen.tsx',
  'src/screens/profile/ContactScreen.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // Simple regex to replace single quotes inside JSX Text with &apos;
  content = content.replace(/>([^<]+)</g, (match, p1) => {
    return '>' + p1.replace(/'/g, '&apos;').replace(/"/g, '&quot;') + '<';
  });
  fs.writeFileSync(file, content);
}
