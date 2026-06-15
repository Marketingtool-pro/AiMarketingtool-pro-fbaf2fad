const fs = require('fs');
let file = 'src/screens/profile/ContactScreen.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/Alert\.alert\(&apos;(.*?)&apos;, &apos;(.*?)&apos;\)/g, "Alert.alert('$1', '$2')");
content = content.replace(/\|\| &apos;(.*?)&apos;/g, "|| '$1'");
fs.writeFileSync(file, content);
