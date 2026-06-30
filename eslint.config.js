// https://docs.expo.dev/guides/using-eslint/
// Plain flat-config array — no `eslint/config` defineConfig, whose subpath is
// eslint 9+ only. This project pins eslint 8.57.1, so requiring it threw
// ERR_PACKAGE_PATH_NOT_EXPORTED in CI lint.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  expoConfig,
  {
    ignores: ["dist/**"],
  },
];
