const fs = require('fs');
let file = 'src/screens/profile/ContactScreen.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/useState\(&apos;&apos;\)/g, "useState('')");
fs.writeFileSync(file, content);
