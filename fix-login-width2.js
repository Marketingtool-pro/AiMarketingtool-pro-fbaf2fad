const fs = require('fs');
let code = fs.readFileSync('src/screens/auth/LoginScreen.tsx', 'utf8');

code = code.replace(
  'const { width } = Dimensions.get(\'window\');',
  '' 
);
code = code.replace(
  'import { View, StyleSheet, Animated, Dimensions } from \'react-native\';',
  'import { View, StyleSheet, Animated } from \'react-native\';'
);

fs.writeFileSync('src/screens/auth/LoginScreen.tsx', code);
