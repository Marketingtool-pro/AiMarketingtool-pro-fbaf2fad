// Node-style `global` alias used by some dependencies (e.g. react-native-iap),
// which ship raw TypeScript sources that reference it.
// Declaring it here keeps `tsc --noEmit` green without pulling in @types/node.

declare var global: typeof globalThis;
