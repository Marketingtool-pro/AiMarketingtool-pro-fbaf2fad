// Node-style `global` alias used by some dependencies (e.g. react-native-iap),
// which ship raw TypeScript sources that reference it.
// Declaring it here keeps `tsc --noEmit` green without pulling in @types/node.

// `const` (not `var`): only the `global` identifier needs a type, and the
// project's lint forbids `var` (no-var). Declared once; globals.d.ts points here.
declare const global: typeof globalThis;
