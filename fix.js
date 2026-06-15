const fs = require('fs');
const file = 'node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/views/view/WindowUtil.kt';
let code = fs.readFileSync(file + '.bak', 'utf8');

code = code.replace(
  '  statusBarColor = Color.TRANSPARENT',
  `  if (Build.VERSION.SDK_INT < 35) {
    statusBarColor = Color.TRANSPARENT
  }`
);

code = code.replace(
  '    navigationBarColor = Color.TRANSPARENT',
  `    if (Build.VERSION.SDK_INT < 35) {
      navigationBarColor = Color.TRANSPARENT
    }`
);

code = code.replace(
  '    navigationBarColor =\n        if (isAppearanceLightNavigationBars) LightNavigationBarColor else DarkNavigationBarColor',
  `    if (Build.VERSION.SDK_INT < 35) {
      navigationBarColor =
          if (isAppearanceLightNavigationBars) LightNavigationBarColor else DarkNavigationBarColor
    }`
);

fs.writeFileSync(file, code);
