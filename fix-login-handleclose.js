const fs = require('fs');
let code = fs.readFileSync('src/screens/auth/LoginScreen.tsx', 'utf8');

// remove unused handleCloseOtpModal
code = code.replace(
  /  const handleCloseOtpModal = async \(\) => \{\n    setOtpError\(''\);\n    setOtpCode\(''\);\n    setShowOtpModal\(false\);\n  \};\n/g,
  ''
);

fs.writeFileSync('src/screens/auth/LoginScreen.tsx', code);
