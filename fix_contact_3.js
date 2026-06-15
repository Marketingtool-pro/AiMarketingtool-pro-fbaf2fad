const fs = require('fs');
let file = 'src/screens/profile/ContactScreen.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/&apos;(.*?)&apos;/g, "'$1'");
fs.writeFileSync(file, content);

let file2 = 'src/screens/profile/TermsScreen.tsx';
let content2 = fs.readFileSync(file2, 'utf8');
content2 = content2.replace(/\{&apos;(.*?)&apos;\}/g, "{'$1'}");
content2 = content2.replace(/=&apos;(.*?)&apos;/g, "='$1'");
fs.writeFileSync(file2, content2);

let file3 = 'src/screens/profile/PrivacyScreen.tsx';
let content3 = fs.readFileSync(file3, 'utf8');
content3 = content3.replace(/\{&apos;(.*?)&apos;\}/g, "{'$1'}");
content3 = content3.replace(/=&apos;(.*?)&apos;/g, "='$1'");
fs.writeFileSync(file3, content3);
