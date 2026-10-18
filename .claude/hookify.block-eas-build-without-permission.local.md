---
name: block-eas-build-without-permission
enabled: true
event: bash
pattern: eas\s+build|fastlane\s+ios\s+beta|xcodebuild\s+.*archive
action: warn
---

Build reminder (warning only, not a block).

- EAS cloud builds use paid pay-as-you-go credits. Local `bundle exec fastlane ios beta` is free.
- Before a local build, check `xcodebuild -version`: a beta Xcode (build like 27A5194q) can be rejected by Apple at TestFlight.
- Run the build the owner asked for. Do not ask A/B questions (owner rule 8). State the cost in one line in your summary.
- Never ship a fake or demo binary.
