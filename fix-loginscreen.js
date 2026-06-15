const fs = require('fs');
let code = fs.readFileSync('src/screens/auth/LoginScreen.tsx', 'utf8');

code = code.replace(
  'Don\'t have an account? Sign Up',
  'Don&apos;t have an account? Sign Up'
);

code = code.replace(
  '      setOtpUserId(\'\');\n      setOtpCode(\'\');\n      setOtpError(\'\');\n      setShowOtpModal(false);',
  '      // Using setTimeout to avoid synchronous setState inside effect\n      setTimeout(() => {\n        setOtpUserId(\'\');\n        setOtpCode(\'\');\n        setOtpError(\'\');\n        setShowOtpModal(false);\n      }, 0);'
);

fs.writeFileSync('src/screens/auth/LoginScreen.tsx', code);
