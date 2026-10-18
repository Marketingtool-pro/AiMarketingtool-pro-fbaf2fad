# MarketingTool — Phone App (Expo / React Native)

Facts below were checked on 2026-10-15 against the repo. Replaces the `bun init`
boilerplate that sat here since 2026-06-12 (that text does not apply to this app).

# READ THIS FIRST — the local checkout is usually BEHIND origin

This has wasted days across many sessions. It costs 5 seconds to avoid:

```sh
git fetch origin Master
git log --oneline HEAD..origin/Master   # empty = up to date. NOT empty = local is stale
```

- **Branch from `origin/Master`, never from local `Master`.** On 2026-09-18 a build
  was dispatched from a local `Master` that was 5 commits behind; it would have
  shipped the unresized 1024x1024 / 3000x3000 icons again, undoing production 1062.
- **The working copy has 20+ uncommitted files. That is normal — do not clean it.**
  Never `git stash`, `git reset`, or `git checkout` over them. If a clean tree is
  needed: `git worktree add /tmp/<name> -b <branch> origin/Master`.
- **Before trusting a file's contents, know which ref you read.**
  `git show origin/Master:<path>` is the truth. The working copy can be stale *and*
  carry local edits that exist in no commit — that is exactly what broke
  `eas update`: `app.json` had duplicated `associatedDomains` only in the working
  copy, while git was clean.
- **Verify content, not commit ids.** Master is squash-merged, so merged work gets a
  new SHA and `git merge-base --is-ancestor` wrongly reports "not merged".
- **Read `REPO-MAP.md` before hunting through the tree.** 4442 files, over half of
  them in `externals/`. It says which directories ship, which are inert, and which
  are traps — a plugin whose "committed" server is not committed, an Actions
  workflow at the repo root that never runs, a config nothing imports, an entry
  point that is never typechecked.

---

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
