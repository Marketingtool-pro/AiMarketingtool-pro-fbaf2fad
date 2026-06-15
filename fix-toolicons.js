const fs = require('fs');
let code = fs.readFileSync('src/constants/toolIcons.ts', 'utf8');

code = code.replace(
  'import { Platform } from "react-native";',
  '// Unused platform import removed'
);

fs.writeFileSync('src/constants/toolIcons.ts', code);
