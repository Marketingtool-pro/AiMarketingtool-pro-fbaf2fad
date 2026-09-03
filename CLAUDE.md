# MarketingTool phone app — how to work in this repo

Expo / React Native app, `pro.marketingtool.app`. Solo owner; every commit author
is a Claude session. Never say "your team" or treat an old commit as someone
else's decision.

## THE RULE THAT MATTERS MOST

**Check the running system, never the file that describes it.**

Every wrong answer in this project came from trusting a config, a comment, or a
warning. Verified failures of exactly this kind:

| trusted | reality |
|---|---|
| `CLAUDE.md` said "org Actions policy allows only Marketingtool-pro actions" | `allowed_actions` is `"all"`. The rule was false and misled sessions for weeks |
| jobs queued for hours ⇒ "GitHub outage, open a ticket" | GitHub says verbatim: *All GitHub-hosted runners with label [ubuntu-latest] are busy* — a concurrency limit |
| "the react-android patch removed the edge-to-edge calls" | `dexdump` found **8 live `invoke-virtual`** calls to `Window.setStatusBarColor` |
| `strings classes.dex \| grep setStatusBarColor` ⇒ "it's reflection" | a *string* and an *invoke* look identical to `strings`. Disassemble |
| Play: "upgrade to AGP 9.0" | attempted **6 times** across 3 branches, failed every time. RN 0.86 pins `agp = "8.12.0"` |
| a Firebase **test number** reached the OTP screen ⇒ "OTP fixed" | test numbers bypass app verification entirely. Proves nothing |

Before claiming anything works: read the shipped `.aab`/`.apk`, `adb` the device,
`curl` the endpoint, or read the run history. A green config proves nothing.

**Being told you are wrong is not evidence that you are — and being sure is not
evidence either.** Both happened here in one session: a correct finding was
retracted under pressure and later proven right, and a confident "already fixed"
was wrong until `dexdump` settled it. Go and look.

## Package manager

**npm. Not Bun.** `package-lock.json` drives CI and EAS. Yarn is used only for a
single Expo plugin. Ignore any generic "default to Bun" guidance here — this repo
is npm, and mixing them corrupts the lockfile.

`npm config omit=dev` silently strips devDependencies from the lockfile and
breaks `expo-doctor`. Do not set it.

## Auth architecture — the part that keeps breaking

```
Everything (email, Google, Facebook, Apple, sessions, DB)  ->  Appwrite (VPS1)
Phone OTP verification only                                ->  Firebase
```

Firebase and "GCloud" are the **same** project (`marketing-tool-484720`).
Identity Platform, reCAPTCHA Enterprise and Play Integrity all live there.

**iOS verifies phone auth with a silent APNs push. Android does not.** Android
tries Play Integrity, then falls back to reCAPTCHA Enterprise, then to a visible
bot check. Play Integrity only issues a verdict when the app was **installed from
Google Play** — a sideloaded APK always falls through to reCAPTCHA. That
asymmetry is why "works on iPhone, broken on Android" is normal here and must
never be dismissed as a fluke.

### The six Android-only defects (all fixed 2026-09-03, OTP confirmed on device)

1. Android reCAPTCHA key was a Cloud Armor WAF `ACTION_TOKEN` key — Firebase Auth
   cannot use it. iOS's key had no `wafSettings`; only Android was dead.
2. `getCurrentUser()`'s `catch { return null }` swallowed a 401
   `user_more_factors_required`, discarding MFA-pending sessions.
3. `libNitroIap.so` startup crash (fixed in 1033).
4. A device with no Custom Tabs browser → `ERR_NO_MATCHING_ACTIVITY` killed OAuth.
5. Appwrite's single-use OAuth secret was redeemed by 3 racing paths; the losers
   got 401 and were reported to the user as failure — the login had succeeded.
6. **No `onRequestClose` on any `Modal` in `LoginScreen.tsx`.** Android Back did
   nothing, and back-dismissing the country picker left the whole login screen
   swallowing every touch. Android-only by construction: iOS has no Back button.

**Why it hid for 10 days:** `plugins/withFirebaseDeferredInit.js` disables
Crashlytics at boot, so none of it was ever reported. When debugging silence,
suspect that plugin first.

## Release pipeline

`eas build` and `eas submit` run on **EAS cloud builders**. A GitHub runner only
orchestrates — it needs Node and network, no Android SDK, no JDK.

Three ways to ship, all equivalent at the EAS layer:

- `android-deploy-selfcontained.yml` — `workflow_dispatch` / `v*.*.*` tag /
  release. `submit` input defaults to **true**, so a dispatch ships to Play.
- `eas submit --platform android --profile production --id <build-id>` — direct,
  no CI involved.
- Expo's **Build from GitHub** dialog — has an *"Automatically submit to stores
  after building successfully"* checkbox. Unticked, it builds and never submits.

`eas.json`: `production` submit ⇒ track `production`, `releaseStatus: completed`
— a live public release. `appVersionSource: remote`, so EAS assigns versionCode
and the value in `app.json` is ignored.

### GitHub Actions will stall, and it is not an outage

Org is on the **Team** plan. Jobs sit `queued` because the hosted-runner
concurrency limit is saturated: 50+ workflows exist, every PR push fires ~4, and
CodeQL holds a runner 1–2 hours. Do **not** open a support ticket; billing,
budgets, minutes and policy were all checked and are clean.

**Self-hosted runners do not count against that limit.** The org has one:
`Loken`, id 244, labels `[self-hosted, macOS, X64]`, registered org-wide at
`github.com/Marketingtool-pro`, install at `~/ai-marketingtool-llc/actions-runner`.
(A second install at `~/actions-runner` is bound to the wrong repo and
deregistered — ignore it.)

It goes offline because its `.service` names a LaunchAgent plist that no longer
exists. Start it with `./run.sh` from that directory; confirm with
`gh api orgs/Marketingtool-pro/actions/runners`.

An online self-hosted runner still gets **nothing** while a workflow says
`runs-on: ubuntu-latest` — that label only ever matches GitHub-hosted machines.

A `workflow_dispatch` run resolves its workflow file from the commit it starts
at, so a queued run can never pick up a later `runs-on` fix. Dispatch fresh.

`expo-updates` OTA ships JavaScript only. Native manifest changes (intent
filters, ABIs) always require a new build.

## Play Console "recommended actions" — what is real

- **AGP 9.0** — impossible. RN 0.86 pins `agp = "8.12.0"`; 6 attempts failed.
- **Edge-to-edge deprecated APIs** — real, still present, and *not yours*. The
  callers are `androidx.activity.EdgeToEdgeImpl.setUp(...)` and
  expo-splash-screen (identified from dex signatures, minified as `Ld/p;`,
  `Ld/o;`, `LV0/c;`). Fixing needs the same bytecode-patch treatment
  `plugins/withRNEdgeToEdgeFix.js` applies to react-android.
- **Bitmap / manual decode** — traces are Glide (expo-image) and Fresco (React
  Native's own image pipeline). Do **not** "switch to expo-image": the two
  remaining RN `<Image>` uses are inside a **ViewShot capture** and an AdMob
  **`NativeAsset`** binding, and swapping either breaks that feature.
- The broad `-keep class com.google.{android.gms,firebase}.** { *; }` in
  `extraProguardRules` genuinely does defeat R8. Narrowing it is the one real
  memory win — but never in the same release as an auth change.

## Dependencies

`npm audit fix --force` will "fix" `decode-uri-component` by **downgrading
`@react-navigation/native` from 7.x to 3.8.4**, destroying navigation. Never use
`--force` here.

Dev tooling must not live in `dependencies`. `@google/adk`,
`@google/adk-devtools` and `@dev-plugins/react-navigation` sat there unimported,
pulling in a MySQL driver and 5 Dependabot alerts while never reaching the APK
(Metro bundles only what is imported).

`plugins/withRNEdgeToEdgeFix.js` pins a patched react-android AAR. **Re-pin
`PATCHED_VERSION` on every react-native upgrade** or builds ship mismatched
native/JS.

Local `eas build` needs `FORCE_HYPERLINK=0`, otherwise `expo config` exits 7 with
`supportsColor.supportsColor is not a function`.

## Never

- Never publish, print or commit a key, token or `.env` value. `google-services.json`
  being in the repo is **correct** — that file ships inside every APK and is not a
  secret. Never call a credential "leaked" or tell the owner to revoke.
- Never merge to `Master`, force-push, or push to `Master`.
- Never use demo or fake data. Show zeros when there is no data.
- Never display a tool count anywhere in the product.
- Never offer options, a/b/c menus, or ask "want me to…". Decide, do it, report.
- Never claim an app-side result from a `curl`. A 200 proves a server answered.
- Never verify phone auth with a Firebase test number.

## Not part of this project

Azure DevOps (`azure-pipelines.yml` builds an unrelated Docker image), Terraform
(`tfc-getting-started/` is HashiCorp's tutorial with explicitly *fake* resources),
and Cloud Run (`aimarketingtool-pro-fbaf2fad-git` runs `gcr.io/cloudrun/placeholder`;
the `app` service reports `STATUS: False`). None of it serves the phone app.
