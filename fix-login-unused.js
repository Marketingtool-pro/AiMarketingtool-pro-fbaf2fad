const fs = require('fs');
let code = fs.readFileSync('src/screens/auth/LoginScreen.tsx', 'utf8');

code = code.replace(
  '  const { width } = Dimensions.get(\'window\');',
  '' // width is unused
);

code = code.replace(
  '    mfaPending, clearError,',
  '    mfaPending,' // clearError is unused
);

fs.writeFileSync('src/screens/auth/LoginScreen.tsx', code);
