const fs = require('fs');
const files = [
  'src/screens/profile/PrivacyScreen.tsx',
  'src/screens/profile/TermsScreen.tsx',
  'src/screens/profile/ContactScreen.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // First, fix the syntax errors we introduced in previous commits
  content = content.replace(/\{&apos;\\n&apos;\}/g, "{'\\n'}");
  content = content.replace(/\{&apos;\\n\\n&apos;\}/g, "{'\\n\\n'}");
  content = content.replace(/\{&apos;\\u2022&apos;\}/g, "{'\\u2022'}");
  
  // Also if we messed up "arrow-left&quot;"
  content = content.replace(/name="arrow-left&quot;/g, 'name="arrow-left"');
  
  fs.writeFileSync(file, content);
}
