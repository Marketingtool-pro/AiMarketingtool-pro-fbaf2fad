const fs = require('fs');
let code = fs.readFileSync('src/screens/auth/ForgotPasswordScreen.tsx', 'utf8');

code = code.replace(
  'We\'ve sent a password reset link to {email}',
  'We&apos;ve sent a password reset link to {email}'
);
code = code.replace(
  'Enter your email and we\'ll send you a link to reset your password',
  'Enter your email and we&apos;ll send you a link to reset your password'
);

fs.writeFileSync('src/screens/auth/ForgotPasswordScreen.tsx', code);
