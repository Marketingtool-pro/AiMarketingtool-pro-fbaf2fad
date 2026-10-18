# MarketingTool — Phone App (Expo / React Native)

Facts below were checked on 2026-10-15 against the repo. Replaces the `bun init`
boilerplate that sat here since 2026-06-12 (that text does not apply to this app).

## What this repo is
- Expo / React Native app. Remote: `Marketingtool-pro/AiMarketingtool-pro-fbaf2fad`, default branch `Master`.
- Entry: `index.ts` → `registerRootComponent(App)` → `App.tsx` → `src/navigation/AppNavigator.tsx`.
- Type check: `npx tsc --noEmit`. This is an npm project — do not switch to Bun.
- Firebase IS used here (phone OTP, messaging, crashlytics). It is not used by the web app.

## Backend rules
- Login: Appwrite at `https://api.marketingtool.pro/v1`.
- Phone features call Windmill under `f/mobile/*`, never the web scripts under `f/tools/*`.
- No Windmill token inside the app: calls go through the server, which holds the token.
- Never trust a `userId`, plan tier or credit count sent by the app — the server decides.

## Owner rules for this repo
- Never write passwords, tokens or keys into tracked files. Secrets live only in gitignored `.env`.
- No EAS cloud build without the owner asking (paid). Local fastlane builds are free.
- No demo or fake data, and never show a tool count.
- This repo also contains many unrelated third-party folders (Android SDK copies, clones,
  CI runners). Do not touch or remove them without the owner's OK.
