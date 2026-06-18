sed -i.bak -e '/setOtpSent(false);/{' \
  -e 'i\
    setTimeout(() => {' \
  -e '}' \
  -e '/clearFirebaseVerification();/{' \
  -e 'a\
    }, 0);' \
  -e '}' src/screens/auth/LoginScreen.tsx
