// Provides the React Native / Node global object to TypeScript.
// Required by third-party sources such as react-native-iap, which are compiled
// from source under the "react-native" export condition.
declare var global: typeof globalThis;
