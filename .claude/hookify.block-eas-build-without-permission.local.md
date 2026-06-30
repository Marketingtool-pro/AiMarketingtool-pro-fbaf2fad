---
name: block-eas-build-without-permission
enabled: true
event: bash
pattern: eas\s+build|fastlane\s+ios\s+beta|xcodebuild\s+.*archive
action: block
---

🛑 **BUILD GATE — show A/B, wait for an explicit YES in THIS exchange**

A build was requested. Do NOT run it silently. STOP and present this exact A/B choice, then wait for a plain-language YES to A or B before running anything:

**A) EAS cloud build** — `eas build -p ios --profile production --auto-submit`
   - ✅ Works now · stable cloud Xcode · Apple-valid binary
   - 💰 COSTS pay-as-you-go credits (monthly allocation 100% used)
   - Run ONLY if user says "yes EAS / I'll pay" in plain words.

**B) Local fastlane build** — `bundle exec fastlane ios beta`
   - 🆓 Free, uses the local Mac + Xcode
   - ⚠️ VERIFY the active Xcode is a RELEASE build, not a beta seed
     (`xcodebuild -version`; a 5xxx build like 27A5194q = beta → Apple may
     reject the binary at TestFlight processing). Confirm before relying on it.
   - Run ONLY after user says yes.

**Hard rules (user, repeated):**
- "not build without my permisson" · "when i will permisson then used"
- Do NOT assume implicit permission from earlier in the conversation.
- "not fake not demo" — never ship a binary that can't pass Apple.

No explicit YES to A or B in this exact exchange → do not build. Show the A/B choice instead.
