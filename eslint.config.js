// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
<<<<<<< HEAD
    ignores: ["dist/*"],
  }
=======
    ignores: ["dist/**"],
  },
  ...expoConfig,
>>>>>>> 715d76d91 (Potential fix for pull request finding)
]);
