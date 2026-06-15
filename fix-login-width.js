const fs = require('fs');
let code = fs.readFileSync('src/screens/auth/LoginScreen.tsx', 'utf8');

code = code.replace(
  '  Dimensions,\n',
  '' 
);

fs.writeFileSync('src/screens/auth/LoginScreen.tsx', code);
