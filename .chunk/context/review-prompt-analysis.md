# Code Review Pattern Analysis

**Generated:** 2026-06-12T18:14:22-07:00
**Source:** .chunk/context/review-prompt-details.json
**Total Comments:** 624
**Reviewers:** gemini-code-assist, copilot-pull-request-reviewer, github-code-quality, coderabbitai, github-advanced-security

---

# Code Review Analysis Report

## 1. Per-Reviewer Analysis

---

### gemini-code-assist

#### Key Practices

**1. Fail-Safe Purchase & Financial Flow Handling**
Gemini consistently prioritizes correctness in financial/transaction flows, catching bugs where money could be lost silently.
- Example: Interrupted IAP transactions where `pendingUserId` is null causing purchases to be finished without server verification: *"Once a transaction is finished, it is removed from the StoreKit/Google Play queue and cannot be resumed. This means the user will have paid for the purchase, but it will never be verified or credited on the server."*
- Example: `captionRes.text` being undefined crashing Firestore: *"Passing `undefined` to Firestore's `add()` method will throw a runtime error (`FirebaseError: Function CollectionReference.add() called with invalid data. Unsupported field value: undefined`)"*
- Example: Redis healthcheck failing with auth: *"Running `redis-cli ping` in the healthcheck without authentication will fail with a `NOAUTH` error... causing Docker to mark the Redis container as unhealthy"*

**2. Type Safety & Type Consistency Across Systems**
Gemini is vigilant about TypeScript type mismatches that cause compilation failures or silent runtime bugs.
- Example: Tier name change breaking TypeScript: *"Changing the `Entitlement` tier from `'enterprise'` to `'growth'` here will cause a TypeScript compilation error... `grantEntitlement` expects the first argument to be of type `UserProfile['subscription']`, which is defined as: `'free' | 'starter' | 'pro' | 'enterprise'`"*
- Example: `googleAI.model()` returning an object, not a string: *"`typeof model === 'string'` on lines 108 and 121 will always evaluate to `false`... the logged model in Firestore always fall back to `'gemini-2.5-flash'`"*
- Example: `EXPO_PUBLIC_*` required for Expo client access: *"In Expo/React Native, environment variables accessed on the client side must be prefixed with `EXPO_PUBLIC_` to be bundled and accessible at runtime"*

**3. Security: Never Trust Client Input for Privileged Actions**
Gemini flags authentication bypasses and missing server-side validation as critical security issues.
- Example: Firebase phone auth bypass: *"The function accepts a self-reported `firebaseUid` and `phone` number without verifying them against Firebase Auth. This allows any caller to bypass OTP verification and obtain a valid Appwrite session token for any phone number."*
- Example: Hardcoded API credentials: *"**CRITICAL SECURITY VULNERABILITY**: A real Expo Access Token (`EXPO_TOKEN`) has been committed to this repository... Revoke this token immediately"*
- Example: Reviewer bypass backdoor: *"This allows any caller to bypass OTP verification and obtain a valid Appwrite session token for any phone number"*

**4. CI/CD Correctness: Wrong API Keys, Invalid Versions, Missing Permissions**
Gemini catches incorrect usage of external APIs and CI/CD tooling.
- Example: Wrong ASC API relationship key: *"the relationship key for in-app purchases in the App Store Connect API is `inAppPurchaseV2`, not `inAppPurchase`... will cause the API to return a `400 Bad Request` error"*
- Example: Wrong Node.js version for Firebase: *"Firebase Functions does not currently support Node.js version `'24'`. The highest supported LTS version is `'22'`"*
- Example: Wrong import path for Genkit: *"`onCallGenkit` is imported from `'firebase-functions/v2/https'`, but it does not exist in that package. It is exported by `@genkit-ai/firebase`."*

**5. Race Conditions & Resource Leaks**
Gemini identifies temporal dead zone issues, timer leaks, and TOCTOU problems.
- Example: Closure-based event listeners with TDZ: *"if an event (like `ERROR`) is triggered synchronously or extremely quickly during `ad.load()`, the corresponding variable (e.g., `offErr`) might not be initialized yet, leading to a `ReferenceError` or `TypeError`"*
- Example: Timeout not cleared: *"When the promise `p` resolves or rejects before the timeout duration `ms` has elapsed, the scheduled `setTimeout` is not cleared. This leaves the timer active in the JavaScript event loop, which can cause resource leaks"*
- Example: File system race condition: *"The file may have changed since it was checked"* (fs.existsSync + fs.readFileSync pattern)

**6. Proper Error Classification & Defensive Coding**
Gemini insists on checking error codes, validating inputs, and not treating all errors as the same.
- Example: Catch block assuming 404: *"If `users.get` fails due to a network or database error, `users.create` will also fail or throw a 'user already exists' error. Check if the error code is 404 before attempting to create the user"*
- Example: Null error access: *"If `error` is null or undefined, accessing `error.code` will throw a TypeError and crash the application"*
- Example: Empty phone validation: *"If `phone` contains no digits (e.g., `'+'` or `'abc'`), `cleanPhone` becomes an empty string, causing all such requests to map to the same `phone_` user ID"*

**7. Portability & Platform Compatibility**
Gemini flags machine-specific code, deprecated APIs, and platform-specific tools.
- Example: Hardcoded local paths: *"The `PROJECT_ROOT` and `SOURCE_ROOT` variables are hardcoded with absolute paths (`/Users/loken/Developer/...`). This makes the script unusable for other developers"*
- Example: macOS-only `sips` tool: *"The `rich_compress` function uses the `sips` command, which is a macOS-specific tool. This limits the portability of the script"*
- Example: Deprecated Clipboard API: *"The `Clipboard` API has been deprecated and removed from the core `react-native` package"*

#### Notable Repos
`AiMarketingtool-pro-fbaf2fad` — The breadth of issues (IAP transactions, auth bypasses, wrong API keys, type errors) makes this especially instructive. Gemini's comments show how quickly AI-generated code can accumulate critical correctness bugs.

---

### copilot-pull-request-reviewer

#### Key Practices

**1. Type Consistency Across the Entire Codebase**
Copilot emphasizes that renaming types must be done atomically across all usages.
- Example: Growth vs enterprise tier: *"`Entitlement.tier` was changed from `'enterprise'` to `'growth'`, but other parts of the app still model the subscription tier as `'enterprise'`... This breaks call sites like `SubscriptionScreen` where `entitlementForProduct(...).tier` is passed into `grantEntitlement`, and will fail TypeScript builds"*
- Example: State not retained after setDateRange: *"`setDateRange` now makes `userId` optional, but the store doesn't retain the last fetched `userId` and doesn't recompute `performanceData` locally... Either persist the current `userId` in this store or make `userId` required"*
- Example: Server entitlement validation gap: *"Server-side entitlement updates are applied purely from `productId` → entitlement mapping; Apple receipt validation result is logged but never enforced... a caller can upgrade any account by sending a known `productId` without proving a real purchase, which is a direct privilege-escalation risk."*

**2. GitHub Actions Security: Action Pinning & Permissions**
Copilot consistently flags unpinned actions and missing permission scopes.
- Example: Moving tags vs SHA pins: *"Replacing the SHA-pinned action references with mutable major-version tags (`actions/checkout@v4`, `anthropics/claude-code-action@v1`) weakens supply-chain security... GitHub's own hardening guidance recommends pinning third-party actions to a full commit SHA"*
- Example: Permissions too broad for review posting: *"The declared `permissions:` block here grants only `contents: read`, `pull-requests: read`, `issues: read`, and `id-token: write`. With read-only access to PRs and issues, the Claude Code Review action will not be able to post review comments"*
- Example: Fork PR secrets: *"This job will run for forked PRs too, but `CLAUDE_CODE_OAUTH_TOKEN` won't be available to forked `pull_request` workflows"*

**3. Non-Idempotent Operations Must Not Be Retried**
Copilot identifies cases where retry logic can cause duplicate submissions or side effects.
- Example: EAS build retry: *"Don't blindly retry `eas build --auto-submit`... `eas build --auto-submit` initiates both a build and automatic store submission. Retrying the entire command on any non-zero exit can enqueue duplicate builds/submissions"*
- Example: Publish race condition: *"two workflows can both observe the version as missing and then both attempt `npm publish`, causing one job to fail with a publish-conflict even though the package is already published"*
- Example: Submit with --latest: *"Submitting with `--latest` does not necessarily target the build created in the previous step; if another production build for the same platform completes before this command runs, this workflow can submit that other artifact instead"*

**4. Reviewer Bypass Mechanisms Are Security Vulnerabilities**
Copilot flags production backdoors enabled by hardcoded credentials.
- Example: Email+password bypass: *"Hardcoded reviewer-bypass credentials in the production login path allow anyone who knows these values to authenticate as a 'pro' user, which is effectively a backdoor. Remove this bypass from production code, or gate it behind a build-time flag"*
- Example: Phone number fuzzy matching: *"The reviewer phone bypass matches by last-10-digits (endsWith), which makes the bypass trigger for any number that happens to share the same suffix... any user can enter a number ending in '9999999999' and hit the bypass path"*
- Example: Env var naming mismatch: *"The reviewer bypass env vars documented here (`REVIEWER_PHONE`/`REVIEWER_OTP`) don't match what the code reads (`EXPO_PUBLIC_REVIEWER_PHONE`/`EXPO_PUBLIC_REVIEWER_OTP`)"*

**5. Dependency Version Alignment**
Copilot flags mixed version ranges in coupled packages.
- Example: React Native Firebase version skew: *"Most `@react-native-firebase` packages are pinned to an exact version, but `@react-native-firebase/app` uses a caret range. This can allow a mismatched minor/patch version vs the rest of the RNFB suite"*
- Example: React version range vs exact: *"`react` is declared as a range (`^19.2.3`) while `react-dom` is pinned to `19.2.3`... Making `react` an exact version reduces the risk of accidentally resolving a newer React"*
- Example: Spurious dependencies: *"`axios` is added as a runtime dependency, but it isn't referenced anywhere under `src/`... This increases the shipped dependency surface without affecting the app build"*

**6. Scope Creep in PRs**
Copilot notes when PRs contain unrelated changes that should be separated.
- Example: Build number in CI PR: *"This PR is scoped to CI/workflow cleanup, but it also bumps the iOS build number. If this is not part of a coordinated app release, it should be reverted"*
- Example: Firebase perf in hotfix: *"PR title/summary describe only syncing google-services.json and removing the RN patch, but this change also adds Firebase Performance Monitoring and Remote Config dependencies"*
- Example: Mixed concerns: *"The PR description is scoped to 'phone-session OTP failure', but this diff also: adds `@react-native-firebase/perf@^24.0.0` to the app, adds two new OAuth client entries to `google-services.json`, bumps `versionCode`"*

#### Notable Repos
`AiMarketingtool-pro-fbaf2fad` — The CI/CD workflow evolution is particularly instructive, showing how Copilot tracks consistency across multiple workflow files and flags cascading impacts of retry/idempotency bugs.

---

### github-code-quality

#### Key Practices

**1. Dead Code Elimination**
Every comment flags variables that are imported or declared but never referenced.
- Examples of flagged unused symbols: `ID` from node-appwrite, `Platform` from react-native, `SkiaText`/`useFont` from Skia, `BorderRadius`/`Spacing`, `width`, `clearError`, `handleCloseOtpModal`, `original`/`patched` template strings, `isLoading`, `isVisionOS`
- Pattern: The tool is purely mechanical — it reports CodeQL/static analysis findings about unused bindings and provides minimal suggested fixes like "Remove `ID` from the destructured import on line 7"
- The suggestions always favor removing the dead code over implementing it: *"The best fix is to remove the unused `original` variable declaration block... while keeping behavior unchanged"*

**2. Useless Assignments (Dead Stores)**
Flags variables assigned but whose values are never read.
- Example: `plan` variable in dashboardStore: *"The initial value of plan is unused, since it is always overwritten... replace the standalone default initializer and compute `plan` directly from the subscription query result"*
- Example: `appwriteUser` pattern: *"In `appwrite-functions/phone-session/src/main.js`, update the body destructuring line to remove `googlePurchaseToken` from the destructured variables"*

**3. Consistent Explanations with Minimal Change Principle**
Every suggestion emphasizes making the smallest possible change to fix the issue.
- Pattern: *"The best fix is to remove only the unused binding from the destructuring while leaving the rest of the code intact"*
- Pattern: *"The best single change is to delete the entire declaration line... No other code changes, imports, methods, or definitions are needed"*

#### Notable Repos
This reviewer is entirely automated (CodeQL/Codacy). The value is showing what static analysis catches automatically vs what requires human review.

---

### coderabbitai

#### Key Practices

**1. Supply Chain Security for GitHub Actions**
CodeRabbit consistently flags unpinned action references and missing security hardening.
- Example: *"Pin `ruby/setup-ruby` to a commit SHA in `production-deploy.yml`... while other actions in this workflow are already commit-pinned"*
- Example: *"Set `persist-credentials: false` to prevent credential exposure... When triggered on PRs from forks, the checked-out code could potentially exfiltrate persisted credentials"*
- Example: Codacy fork protection: *"On forked PRs the secret isn't provided, so `${{ secrets.CODACY_PROJECT_TOKEN }}` becomes empty; the `codacy/codacy-analysis-cli-action` only configures auth when the token is non-empty"*

**2. Operational Reliability: Timeouts, Build IDs, and Fallback Safety**
CodeRabbit focuses on production reliability of CI/CD pipelines.
- Example: EAS build ID pinning: *"Pass the exact uploaded build into `scripts/asc_autosubmit.rb`... if `BUILD_NUMBER` is set the fallback path can attach an older `VALID` build instead of the one this workflow just uploaded"*
- Example: Retry-on-any-error anti-pattern: *"This retries all failed production builds, not just transient EAS/GitHub outages. A deterministic native build or signing failure would be rebuilt up to five times per platform before surfacing"*
- Example: JWT expiry during long waits: *"The ASC JWT is generated once at startup... When `BUILD_NUMBER` is set the script can sleep/poll for ~20 minutes, which can exceed the 1100s token expiry"*

**3. API Correctness for External Services**
CodeRabbit verifies exact API contracts against documentation.
- Example: App Store Connect relationship key: *"Abort on failed `reviewSubmissionItems` attachment before submitting (`submitted: true`)... can lead to incomplete/auto-rejected review sets if any item attachment fails"*
- Example: GitHub Actions permissions scope: *"Fix invalid GitHub Actions permissions for dependency submission — Remove `dependency-graph: write` — `dependency-graph` is not a valid workflow permission scope"*
- Example: Expo runtime env vars: *"In `src/services/firebaseAppCheck.ts`... `process.env.IS_TESTING` and `process.env.FIREBASE_APPCHECK_DEBUG_TOKEN_ANDROID/IOS` won't be available in the bundled Expo client (Expo only inlines `EXPO_PUBLIC_*` vars)"*

**4. Security: Unguarded Untrusted Input Triggers**
CodeRabbit flags workflows that can be triggered by untrusted actors.
- Example: Claude workflow without auth gate: *"This workflow uses `secrets.CLAUDE_CODE_OAUTH_TOKEN` on a `pull_request` trigger. For PRs from forks, GitHub Actions won't expose repository secrets"*
- Example: Missing author association check: *"Because the job uses repository secrets (`secrets.CLAUDE_CODE_OAUTH_TOKEN`) this is a security risk on public repos: an untrusted actor could mention `@claude` and cause the job to run with secrets"*

**5. Idempotency and State Management**
CodeRabbit identifies operations that should be idempotent but aren't.
- Example: Review submission idempotency: *"Creating a new review submission via `POST /v1/reviewSubmissions` will fail with a `409 Conflict` if there is already an active review submission... first fetch existing submissions and reuse any active submission"*
- Example: Pages workflow conditional: *"`_site` is created empty on Line 32, so the check on Line 35 is always true. This step will always generate the placeholder page and never publish a checked-in `index.html`"*

#### Notable Repos
`AiMarketingtool-pro-fbaf2fad` — The App Store Connect submission script analysis (JWT expiry, relationship key, idempotency) shows particularly deep domain-specific review expertise.

---

### github-advanced-security

#### Key Practices

**1. CodeQL: Unused Variables & Dead Code (Static Analysis)**
The automated scanner flags the same classes of dead code as github-code-quality.
- Pattern: Consistently detects unused imports (`ID`, `Platform`, `Models`, `PLATFORMS`, `Tool`, `SkiaText`, `useFont`, `BorderRadius`, `Spacing`)
- Pattern: Unused variables (`isLoading`, `isVisionOS`, `AiAssistantImage`, `consecutiveErrors`, `handleCloseOtpModal`)
- Pattern: Useless assignments (`appwriteUser` pattern repeated across multiple PRs)

**2. Workflow Security: Missing Permissions**
Automated detection of workflows without explicit `permissions` blocks.
- Pattern: Multiple workflows flagged: *"Actions job or workflow does not limit the permissions of the GITHUB_TOKEN. Consider setting an explicit permissions block, using the following as a minimal starting point: `{contents: read}`"*
- Affected workflows: Build and Test, Code Quality, Production Deploy, Firebase hosting deploy, Java CI with Maven
- The same finding repeats across ~10+ PRs showing systematic omission

**3. Unpinned Action References**
SHA pinning enforcement across all third-party action references.
- Pattern: `anthropics/claude-code-action@v1` flagged repeatedly across PRs #13, #14, #41, #62, #63, #64, #65, #66, #68
- Pattern: `expo/expo-github-action@v8` flagged across Build and Test, Production Deploy workflows
- Pattern: `gradle/actions/dependency-submission@v4` flagged

**4. File System Race Conditions**
CodeQL detects the `existsSync` + `readFileSync` TOCTOU pattern.
- Pattern: `if (!fs.existsSync(appDelegatePath)) { ... } let content = fs.readFileSync(appDelegatePath, 'utf8');` flagged repeatedly
- The same pattern appears in `withIosFirebaseSwiftFix`, `withEasPodfileFix`, `withAndroid15EdgeToEdge`, `withIosExcludeIap` across multiple PRs
- Also: `if (fs.existsSync(gradlePropsPath)) { let props = fs.readFileSync(gradlePropsPath, 'utf8');`

**5. File Data in Outbound Network Requests**
CodeQL flags private key material flowing into network request headers.
- Example: *"Outbound network request depends on file data"* for `attach-iaps-and-submit.js` where `privateKey = fs.readFileSync(...)` flows into JWT signing and then into HTTP Authorization headers
- This pattern appears in both `scripts/attach-iaps-and-submit.js` and `scripts/asc_clear_sub_rejections.js`

**6. Shell Script Safety: `read` Without `-r`**
Shellcheck findings propagated through Codacy.
- Pattern: `read -p "..."` flagged in screenshot capture scripts across multiple PRs
- Pattern: `read -s GENAI_KEY` flagged in setup scripts
- Finding: *"read without -r will mangle backslashes"* — consistent Shellcheck SC2162

---

## 2. Cross-Cutting Themes

### Theme 1: Security Must Be Enforced at System Boundaries, Not Bypassed for Convenience
**All five reviewers** flag some form of security bypass or missing enforcement:
- gemini-code-assist: Firebase ID token validation missing, hardcoded EXPO_TOKEN, missing server-side receipt validation
- copilot: Reviewer bypass backdoors with hardcoded credentials, fuzzy phone number matching enabling bypass
- coderabbitai: Claude workflow executable by untrusted actors, missing `persist-credentials: false`
- github-advanced-security: Workflows without permission limits, private key material in network requests

The core teaching: **security shortcuts that "work for now" (reviewer bypasses, skipped server validation, overpermissioned workflows) become permanent attack surfaces**. Every reviewer catches a different manifestation of this principle.

### Theme 2: External API Integration Requires Exact Contracts
Multiple reviewers catch incorrect usage of third-party APIs:
- gemini-code-assist: Wrong `inAppPurchaseV2` relationship key, wrong `onCallGenkit` import path, wrong `hasClaim` usage, wrong Node.js version for Firebase
- copilot: Wrong `asyncPolicy` function signature, missing Android track in eas.json after removing submit config
- coderabbitai: Non-existent `dependency-graph` permissions scope, App Store Connect JWT expiry during polling, ASC submission without IAP attachment guard

The pattern: **AI-assisted code frequently hallucinates API names, import paths, and argument shapes**. Reviewers provide the most value by verifying exact contracts.

### Theme 3: Idempotency and State Consistency Are Systematically Neglected
Multiple reviewers identify operations that aren't idempotent but should be:
- gemini-code-assist: `applyLocalEntitlement` reads stale profile state before `set()`, `pendingUserId` null causing lost purchases
- copilot: `eas build --auto-submit` retry creates duplicate submissions, `npm publish` race condition
- coderabbitai: ASC review submission not checking for existing `PREPARE_FOR_SUBMISSION` state, Pages workflow always overwriting index.html
- copilot: `setDateRange` losing userId context

The pattern: **state management bugs are often "invisible" — the happy path works, but edge cases (app restart, concurrent runs, retries) expose lost state**.

### Theme 4: Automation Catches Mechanical Issues; Human Review Catches Architectural Ones
The divide between automated and human reviewers is stark:
- **Automated** (github-code-quality, github-advanced-security): Unused variables, missing permissions, unpinned actions, shell quoting — all mechanical, caught consistently, same findings repeated across PRs
- **Human-equivalent** (gemini-code-assist, copilot, coderabbitai): Lost purchase flows, privilege escalation, JWT expiry during polling, submit targeting wrong build — require understanding *intent* vs *behavior*

This means the automated findings show what should be in linters; the human findings show what requires architectural documentation.

---

## 3. Recommendations

### Automated (Linters / CI Checks)

| Issue | Automation |
|-------|-----------|
| Unpinned GitHub Actions | Add `zizmor` or `actionlint` to CI; enforce SHA pinning in PR checks |
| Missing `permissions` blocks | `actionlint` flags this; add as required CI check |
| `EXPO_PUBLIC_*` prefix enforcement | Custom ESLint rule: warn when `process.env.FIREBASE_*` or `process.env.IS_*` used in app code |
| Unused imports/variables | ESLint `no-unused-vars` + TypeScript `noUnusedLocals: true` already catches this; ensure `tsconfig.json` strict mode |
| `read` without `-r` in shell | Add `shellcheck` to CI for all `.sh` files |
| `fs.existsSync` + `fs.readFileSync` TOCTOU | Custom ESLint rule to warn on this pattern in plugin files |
| Firebase version alignment | Script in CI: `jq '[.dependencies | to_entries[] | select(.key | startswith("@react-native-firebase/"))] | group_by(.value) | length > 1'` |
| `package.json` `"type": "module"` + CommonJS conflict | Add test: `node -e "require('./src/main.js')"` in function CI |

### Documented (Style Guides / Architectural Docs)

**In-App Purchase (IAP) Lifecycle Doc**:
- Document the complete purchase → verify → entitle flow
- Specify: purchases must always be finished, even when verification fails
- Specify: `pendingUserId` fallback to `account.get()` is required

**Authentication Architecture Doc**:
- Reviewer bypasses must use `__DEV__` + build-time flags only, never runtime env vars with fallback defaults
- Firebase ID token verification is mandatory before any Appwrite session creation
- No hardcoded credentials in source — link to secret rotation runbook

**CI/CD Pipeline Standards**:
- All third-party actions must be pinned to commit SHA with version comment
- All workflows must declare explicit `permissions` blocks
- `eas build` and `eas submit` must be separate steps (no `--auto-submit` in CI)
- Build IDs must be captured and passed explicitly between steps

**External API Integration Checklist**:
- Verify exact import paths for each SDK (e.g., `onCallGenkit` from `@genkit-ai/firebase`, not `firebase-functions/v2/https`)
- Document supported runtime versions (e.g., Firebase Functions supports Node 20/22, not 24)
- Verify all relationship key names against live API docs before commit

### Taught (Onboarding / Examples)

**"The Lost Purchase" Scenario** (onboarding module):
Walk through what happens when a user is mid-purchase and the app is killed. Show the `purchaseUpdatedListener` fires on next launch with `pendingUserId === null`. Teach the fallback pattern: `account.get()` → verify → `IAP.finishTransaction`.

**"Idempotency First"** (workshop):
Using the ASC submission script as a case study, teach: check-before-create, handle 409 gracefully, capture resource IDs early and pass them explicitly. Contrast with the naive create-always approach.

**"AI-Generated Code Review Checklist"** (pair programming guide):
Since much of this code appears to be AI-generated, teach developers to specifically verify:
1. Do all import paths actually exist in the package?
2. Do all type values match the union types they'll be assigned to?
3. Does every financial/purchase flow have a fallback for the null session case?
4. Are all credentials read from environment, never hardcoded?

**"Security Bypass Anti-Patterns"** (security training):
Show the reviewer bypass evolution: hardcoded credentials → env var with hardcoded default → fuzzy phone matching. Explain why each iteration is still insecure and what "correct" looks like: server-side feature flags, short-lived test accounts managed in a secrets manager, never client-side conditionals.

---

*This analysis was generated using Claude AI by analyzing code review patterns.*
