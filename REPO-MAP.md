# Repo map — what every top-level directory is

4442 files on Master. Nobody reads them all, so this says what each part is, what
is live, and what is inert. **Verified on 2026-09-18 against `origin/Master`
(47c416d0ee)** by listing the tree and grepping for real references — not from
memory and not from older docs.

Re-verify before trusting a line here. The rule that matters in this repo is
still: check the running system, not the file that describes it.

## Ships in the app

| path | files | what it is |
|---|---|---|
| `src/` | 1536 | the app. Screens, navigation, services, state, assets |
| `assets/` | 230 | icons, splash, platform logos. Budgets enforced by `npm run icons:compress` |
| `plugins/` | 16 | Expo config plugins. **12 are referenced by `app.json`**; 4 are not (`withAndroid16KBAlignment`, `withAndroidMaterialPin`, `withAndroidxCorePin`, `withFirebaseSwiftFix`) |
| `patches/` | 6 | patch-package patches, applied by `postinstall`. Two are iOS-only Firebase header fixes; one patches React Native's `EventPerformanceLogger.cpp` |
| `android-patches/` | 11 | **load-bearing.** Kotlin overrides of `StatusBarModule.kt` / `WindowUtil.kt`, built into a patched `react-android` AAR by `.github/workflows/patch-react-android.yml`. Must be re-pinned whenever `react-native` moves |

## Backend, deployed separately

| path | files | what it is |
|---|---|---|
| `functions/` | 7 | Firebase Functions v2 + Genkit. Deployed by `.github/workflows/deploy-functions.yml`. Has its **own** `package.json` and lockfile |
| `appwrite-functions/` | 5 | Appwrite functions (`phone-session`, `iap-verify`, …). No workflow deploys these — they live inside Appwrite, so the repo copy can drift from what is running |

## Tooling and CI

| path | files | what it is |
|---|---|---|
| `.github/` | 36 | workflows. The ones that work carry **zero `uses:`** lines |
| `scripts/` | 9 | `fix-gradle.js` runs on every EAS build (pre/post install). `asc_*.rb` are App Store Connect helpers, run by hand |
| `fastlane/` | 6 | used by `npm run iap:verify` → `fastlane ios test_iap_config` |
| `gradle/`, `.husky/`, `.devcontainer/` | 11 | build wrapper and local hooks |

## Present but referenced by nothing

Checked by grepping the whole tree for each path. Listed as an inventory, not a
deletion list — "no grep hit" is not proof something is unused.

| path | files | note |
|---|---|---|
| `externals/` | 2311 | **over half the repo by file count.** No code or workflow references it |
| `marketingtool/` | 35 | a Scala/sbt project (`build.sbt`, `src/main`, `src/test`). Only mentioned in `.playwright-mcp` session dumps |
| `test/` | 21 | only referenced from `functions/` |
| `conductor/` | 11 | planning docs and specs from the Conductor tool |
| `my-env-plugin/` | 9 | unreferenced |
| `gh-cli/` | 7 | unreferenced |
| `cli/cmd/gh/` | 1 | a single `main.go` from the GitHub CLI source |
| `infra/` | 6 | unreferenced |
| `MyMacro/` | 5 | a Swift macro sample package. Not in the iOS build |
| `.playwright-mcp/` | 51 | saved browser-session dumps |

## Known traps, each verified the hard way

- **`plugin-rn-mcp/`** — its `server/package.json` says *"node_modules is committed so
  the server runs with no install step after a marketplace clone"*. It is not: only
  6 files are tracked, and the path `.mcp.json` launches
  (`server/node_modules/react-native-mcp-kit/dist/server/cli.js`) is absent from the
  repo. It works only on a machine where it was installed. Versions disagree too:
  `plugin.json` 1.5.0, `server/package.json` 4.4.0, dependency `react-native-mcp-kit` 5.4.1.
- **`kotlin.code-quality.yml`** — an Actions workflow at the **repo root**, not under
  `.github/workflows/`, so it never runs. It declares `contents: write`, a self-hosted
  runner, and triggers on push to `main`/`Master`/`develop` — moving it would make it live.
- **`tamagui.config.ts`** — imported by nothing. Tamagui is four packages in
  `package.json` and `gemini.md` calls it "the Design System"; no source file uses it.
- **`tsconfig.json`** — excludes `index.ts`, which is `package.json`'s `"main"`. The
  entry point is never typechecked.
- **`src/components/common/index.ts`** — the barrel is imported nowhere; every component
  is imported by direct path. `PerformanceChart.tsx` has no importers at all.
- **Two `tool-icons-v2` folders exist** — `src/assets/images/tool-icons-v2/` (1451 files,
  ~314 reachable from a `require()`) and `assets/images/tool-icons-v2/` (onboarding art).
  They are different directories; check which one a path means.
