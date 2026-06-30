const fs = require('fs');
let code = fs.readFileSync('src/screens/auth/LoginScreen.tsx', 'utf8');

code = code.replace(
  '  Easing,\n',
  ''
);

fs.writeFileSync('src/screens/auth/LoginScreen.tsx', code);
