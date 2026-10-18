// https://docs.expo.dev/guides/using-eslint/
// Plain flat-config array, no `eslint/config` defineConfig. eslint-config-expo/flat
// exports an array of configs, so it must be spread: ESLint 10 rejects an array
// nested inside the config array ("TypeError: Unexpected array").
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: ["dist/**"],
  },
];
