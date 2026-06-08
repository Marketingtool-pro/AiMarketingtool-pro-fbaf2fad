# MarketingTool Copilot Instructions

## Build, test, and lint commands

### App root
- `npm ci`
- `npm start`
- `npm run ios`
- `npm run android`
- `npm run web`
- `npm run doctor`
- `npx tsc --noEmit` — this is the TypeScript check used by `.github/workflows/code-quality.yml`
- CI calls `npm run lint --if-present` and `npm test --if-present`, but the root `package.json` does not currently define `lint` or `test` scripts. Do not assume a runnable root lint/test suite exists.

### Firebase Functions package
- `cd functions && npm ci`
- `cd functions && npm run build`
- `cd functions && npm run lint`
- `cd functions && npm run serve`
- `cd functions && npm run shell`
- There is a checked-in spec at `functions/integration-tests/integration-test.spec.ts`, but there is no checked-in `test` script or runner config for it. Do not invent a single-test command unless you wire the runner first.

### Shipping / EAS
- Root scripts exist for store builds: `npm run ship`, `npm run ship:ios`, `npm run ship:android`
- GitHub Actions also runs `eas build` / `eas submit` from `.github/workflows/production-deploy.yml`
- Do **not** trigger EAS builds or submissions without explicit user approval; this repo has an existing `.claude` rule for that

## High-level architecture

- This repository is the phone app repo (`Marketingtool-pro/AiMarketingtool-pro-fbaf2fad`). In the local workstation layout, the matching working copy is in a local directory like `<path_to_your_workspace>/MarketingTool_Phone`. The matching web repo is `Marketingtool-pro/web-app-router-`, with local working copy `<path_to_your_workspace>/MarketingTool_Web`. Keep both local repos aligned with their GitHub repos and avoid drifting work across duplicate copies. For auth, AI generation, or webhook-driven behavior, expect fixes to sometimes require checking both repos.

- Treat `/Users/anshsingh/Desktop/Developer` as the single Marketingtool-pro organization workspace root. Keep the two product repos (`MarketingTool_Phone` and `MarketingTool_Web`) as the primary repos in that workspace rather than replacing them with a different structure.

- The mobile app is an Expo / React Native app rooted at `App.tsx` and `src/navigation/AppNavigator.tsx`. Startup is intentionally staged: the splash screen stays visible while fonts, auth bootstrap, and Firebase App Check initialize; Firebase messaging, analytics, and crashlytics are deferred until after first layout to avoid Android startup ANRs.

- Auth is hybrid. `src/services/appwrite.ts` is the main account/database client, while phone OTP verification happens through `src/services/firebaseAuth.ts`. After Firebase verifies the phone number, `src/store/authStore.ts` calls the Appwrite `phone-session` function to mint the Appwrite session used by the rest of the app.

- AI generation is also hybrid. `src/store/toolsStore.ts` loads the 314-tool catalog from `src/data/tools.js`, derives categories/free-vs-pro/icon overrides locally, and calls `src/services/aiService.ts`. That AI service currently prefers Appwrite Function `tool-executor` and falls back to Next.js APIs on `https://app.marketingtool.pro`. The separate `functions/` package contains Firebase Functions + Genkit callable flows (`toolExecutor`, `chatAi`), but the mobile app is not wired directly to those callables today.

- Backend code is split across two server packages:
  - `functions/`: Firebase Functions v2 + Genkit + Firestore
  - `appwrite-functions/phone-session`: Appwrite function that mints an Appwrite session from a verified Firebase Phone Auth UID

- Do not assume a single backend owns all state. Profiles and Appwrite sessions live in Appwrite, while some AI/chat code writes to Firestore, and the mobile client still contains Appwrite-first AI and auth wiring.

- The web side also has organization-level webhook integrations. Treat webhook endpoints and signed/tokenized URLs as secrets that belong in environment/config management, not in committed source or instruction files.

## Key conventions

- When work spans phone + web behavior, inspect both repos and carry the intended changes through to committed/merged state instead of updating only one side.

- Make code changes in the matching workspace repo folders under `/Users/anshsingh/Desktop/Developer` so phone-app work lands in `MarketingTool_Phone` and web-app work lands in `MarketingTool_Web`.

- Keep both the phone repo and the web repo working trees clean and matched to their GitHub remotes after intended work is complete.

- Run a code review on meaningful changes before merge/push. For future Copilot sessions, use the review flow on current diffs as a normal closing step, not only when the user separately asks for review.

- Default completion flow for intended code changes in this workspace: make the change, review the diffs, then merge/push the finished work unless the user explicitly says to stop earlier.

- Before changing code, read `SECURITY.md` and the relevant root-level `*.md` files that affect the task. Do not jump straight into edits without first reading the repo guidance and security notes.

- Stay in the matching local workspace repo and do not jump to unrelated folders. If phone work changes shared behavior, then read the web repo too; if web work changes shared behavior, then read the phone repo too.

- Fix issues one-by-one, including very small bugs, before giving the explanation. Do not skip listed issues, do not bypass edge cases, and do not leave a partially-checked chain of fixes.

- Keep final explanations short and after the work. Do not spend turns on extra discussion when the user has asked for action.

- Treat `package.json`, lockfile, and dependency-version changes as production-sensitive. Both apps are paid/production apps, so npm dependency updates must be intentional, reviewed, and not casually widened or downgraded.

- `app.json` is the authoritative Expo plugin list. `app.config.js` only appends require-based plugins that cannot be expressed as plain JSON. Do **not** replace `config.plugins` in `app.config.js`, or you will silently drop critical Firebase / notification / App Check plugins.

- Keep `plugins/withFirebaseDeferredInit.js` and the `deferredInit()` logic in `App.tsx` aligned. The Android manifest plugin disables Firebase auto-init at startup, and `App.tsx` re-enables messaging/analytics/crashlytics after the first layout. Changing one side without the other can reintroduce cold-start hangs and ANRs.

- Do not reintroduce `expo-status-bar` or older direct system-bar color APIs. This app intentionally uses `react-native-edge-to-edge` and `<SystemBars />` because of Android 15 behavior.

- The tool catalog source of truth is `src/data/tools.js`, not a hardcoded array inside a screen. `src/store/toolsStore.ts` derives category mapping, free/pro gating, and unique icon assignment from tool slugs and badges. Preserve slug stability and the web-app-aligned category mapping when editing tool metadata.

- Appwrite function responses are not uniform in this codebase: they may arrive as an object, a JSON string, or plain text. Reuse the normalization pattern in `src/store/authStore.ts` / `src/services/aiService.ts` instead of assuming one response shape.

- The reviewer bypass values for phone auth are intentional. They live in `src/store/authStore.ts` (EXPO_PUBLIC_REVIEWER_PHONE / EXPO_PUBLIC_REVIEWER_OTP) for the App Store / Play Store review test phone / OTP flow.

- Keep secrets out of source. Firebase Genkit uses Secret Manager (`defineSecret(...)` in `functions/src/index.ts`), and the Appwrite function expects env vars instead of inline credentials.

- Prefer the current runtime code over older planning docs. The repo contains historical design/plan files under `docs/superpowers/` that describe earlier OTP and backend paths; verify the live wiring in `authStore.ts`, `firebaseAuth.ts`, `aiService.ts`, and the backend packages before changing cross-cutting flows.

- If Firebase or Google Cloud MCP tooling is available in a future session, use it first for:
  - Firebase Functions issues in `functions/src/index.ts`
  - Firestore data-path questions (`generations`, `chat_sessions`, `chat_messages`)
  - App Check / Messaging / Secret Manager investigations
  - Verifying deployed backend config before changing mobile-side fallbacks

## Android SDK & Compile Requirements (API 36 / Android 16)
- **Important**: This project uses Expo SDK 56 which relies on `WindowCompat.enableEdgeToEdge()` inside `expo-dev-launcher`. This API requires compiling against **Android 16 (API 36)**.
- Always ensure `compileSdkVersion` and `targetSdkVersion` are set to `36` in both `android/build.gradle` and `app.json` (under `expo-build-properties` plugin configurations).
- **Core Dependency Pin**: Do **NOT** pin `androidx.core` to older versions (e.g., `1.15.0`) in Gradle's `resolutionStrategy` because it will cause compilation errors with unresolved edge-to-edge references.

## Native Graphics & Skia Binaries
- The `@shopify/react-native-skia` native module requires prebuilt binaries to compile on Android.
- If native compilation fails due to missing `libskia.a`, always run:
  `npx install-skia`
  This downloads and places the required `.a` libraries under `node_modules/@shopify/react-native-skia/libs/android/`.

## Package Management & GitHub Packages
- The project publishes Node.js packages directly to **GitHub Packages** (`npm.pkg.github.com`).
- npm package publishing is automated via GitHub Actions in `.github/workflows/publish-package.yml` and `.github/workflows/npm-publish-github-packages.yml`.
- Creating and publishing a new **GitHub Release** (e.g., `v1.5.0`) automatically pushes the git tag and triggers the publishing workflows using the repository secrets.

## Deployment & CI/CD

### Android EAS Build & Submit
- The GitHub Actions runner executes `.github/workflows/production-deploy.yml` on push to the `Master` branch or on tag creation `v*.*.*`.
- It executes `eas build --platform android --profile production` and automatically submits the compiled AAB to the Play Store via `eas submit --platform android`.

### Firebase Web Hosting
- Web builds are compiled using Expo Web Export (`npm run build` triggers `expo export --platform web`).
- The generated output in `dist/` is automatically deployed to Firebase Hosting (`marketing-tool-484720`) via the `.github/workflows/firebase-hosting-merge.yml` workflow using the configured `firebase.json`.
