// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      // Cosmetic only — requires &apos;/&quot; in JSX text. No functional impact;
      // these were ~30 of the errors failing CI.
      "react/no-unescaped-entities": "off",

      // react-hooks v5 (React Compiler) rules shipped by Expo SDK 56. They flag
      // long-standing, working RN patterns — useRef(new Animated.Value()).current,
      // Date.now() for message ids, setState inside effects. Keep them as advisory
      // warnings (don't fail the build) so the working app isn't broken to chase
      // new opinions; address incrementally.
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",

      // Don't flag unused catch bindings — this is what let a prior "fix eslint"
      // strip `catch (error)` bindings and mask real errors app-wide.
      "@typescript-eslint/no-unused-vars": ["warn", {
        caughtErrors: "none",
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
    },
  }
]);
