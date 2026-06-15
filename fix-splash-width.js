const fs = require('fs');
let code = fs.readFileSync('src/screens/auth/SplashScreen.tsx', 'utf8');

code = code.replace(
  'const { width, height } = Dimensions.get(\'window\');',
  '' 
);
code = code.replace(
  'import { View, StyleSheet, Animated, Dimensions } from \'react-native\';',
  'import { View, StyleSheet, Animated } from \'react-native\';'
);

fs.writeFileSync('src/screens/auth/SplashScreen.tsx', code);
