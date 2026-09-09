---
name: block-unverified-fix-claims
enabled: true
event: stop
pattern: .*
action: warn
---

⚠️ **Before stopping: verify, finish, and read real code.**

**1. Don't claim "fixed" without evidence.**
If you claim X is fixed, you must have evidence X actually works.

- [ ] Ran an end-to-end test that exercises the fix
- [ ] Saw real output proving it works (not just "code compiles")
- [ ] Visible UI change: tested on device / screenshot
- [ ] Backend: curled or otherwise hit the endpoint

Does NOT count as verified: "code compiles", "linter passes",
"similar thing worked before", "should work".

If you cannot produce evidence of end-to-end success, say
"I changed X but did not verify end-to-end" — do not claim "fixed".

**2. Finish the FULL request.**
Multi-part requests get every part done, or an explicit list of what
was left out and why. Don't deliver part 1 and ask whether to continue.

**3. Read the real code first.**
Work from `src/`, `functions/`, `appwrite-functions/` — not `.md` files.
