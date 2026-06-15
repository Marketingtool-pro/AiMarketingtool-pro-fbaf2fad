const fs = require('fs');
const files = [
  'src/screens/profile/PrivacyScreen.tsx',
  'src/screens/profile/TermsScreen.tsx',
  'src/screens/profile/ContactScreen.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\{&apos;\\n&apos;\}/g, "{'\\n'}");
  content = content.replace(/\{&apos;\\n\\n&apos;\}/g, "{'\\n\\n'}");
  content = content.replace(/\{&apos;\\u2022&apos;\}/g, "{'\\u2022'}");
  content = content.replace(/&quot;/g, '"');
  content = content.replace(/&apos;/g, "'");
  content = content.replace(/'/g, '&apos;');
  // Undo &apos; inside JS blocks
  content = content.replace(/\{&apos;(.*?)&apos;\}/g, "{'$1'}");
  // Undo &apos; in props
  content = content.replace(/=&apos;(.*?)&apos;/g, "='$1'");
  
  // Actually, unescaped entities are just plain text quotes inside jsx tags.
  fs.writeFileSync(file, content);
}
