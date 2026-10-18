// Provides the React Native / Node global object to TypeScript.
// Required by third-party sources such as react-native-iap, which are compiled
// from source under the "react-native" export condition.
// The declaration lives in global.d.ts; a second `declare const` would be a
// redeclaration error.
