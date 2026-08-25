# MarketingTool — how the system actually fits together

Everything below was read from the live systems on 2026-08-25, not from memory
or from older docs. Where something is a guess it says so.

This file exists because none of it was written down anywhere. That is not a
documentation nicety: the phone app spent months calling the wrong Windmill
script because there was no place where "which script runs a tool" was stated,
and nothing outside Windmill's own UI recorded that two of them existed.

---

## The one-line version

One product, two front ends, one tool engine.

```
marketingtool.pro          marketing site      Firebase Hosting
app.marketingtool.pro      WEB APP             VPS 2  (Supabase for its data)
pro.marketingtool.app      PHONE APP           iOS + Android

api.marketingtool.pro      Appwrite   AUTH for both platforms   VPS 1
wm.marketingtool.pro       Windmill   TOOL ENGINE               VPS 1
```

**Appwrite is auth only. Windmill runs the tools. Supabase is web-app data.**

---

## Who calls what when a tool runs

```
WEB   browser ──────────────────────────────────► Windmill  f/tools/ai-generate
                                                      │
                                                      └─► engine-creative
                                                          engine-automation
                                                          engine-insight

PHONE app ──► Appwrite fn tool-executor ─────────► Windmill  f/mobile/ai_generate
```

Two different entry points. This is the single most important fact in this file.

| | web | phone |
|---|---|---|
| Windmill script | `f/tools/ai-generate` | `f/mobile/ai_generate` |
| Per-tool logic | yes — routes to an engine per tool | no — one hardcoded prompt for all 314 |
| Model | chosen by the engine | Haiku 4.5 (Opus for 9 slugs) |
| Output cap | engine's own | `max_tokens: 3000` |
| User verified | yes — `_validate_jwt(appwriteJwt)` | no — takes `user_id` on trust |
| Hops | 1 | 2 (extra Appwrite cold start) |

`f/mobile/ai_generate` takes `system_prompt` from its caller, and
`tool-executor` hardcodes:

```js
'You are a marketing expert AI. Generate high-quality ' + tool_name + ' content...'
```

That one line is why every phone tool returned generic marketing copy.

---

## How Windmill knows who you are

It does not trust the caller. Every engine starts with:

```python
def _validate_jwt(jwt_token, expected_uid=""):
    if not jwt_token: return None, "Authentication required"
    Request(f"{APPWRITE_ENDPOINT}/account",
            headers={"X-Appwrite-Project": ..., "X-Appwrite-JWT": jwt_token})
```

It calls Appwrite `/account` with the JWT and confirms the user itself. The web
client puts that JWT in every request body. Any new caller must do the same —
mint one with `account.createJWT()`.

---

## VPS 1 — `31.220.107.19`, KVM 8 (8 CPU / 32 GB)

Six docker compose projects:

| project | what it is | state |
|---|---|---|
| `nginx-proxy-manager-kyk2` | front door, host network, SSL | running |
| `appwrite` | auth + 6 functions, 25 containers | running |
| `mariadb` | Appwrite's database | running |
| `windmill` | server :3002, **2 workers**, postgres, redis | running |
| `root-agent` | node admin API on **:3010**, mounts docker.sock | running |
| `root` | old postgres+redis, default creds | **stopped 6 weeks** |

Notes worth acting on eventually:
- **2 Windmill workers** for 314 tools — concurrent runs queue.
- `root-agent` is published on 0.0.0.0:3010 with docker.sock mounted. Mounting
  the socket `:ro` does **not** make the Docker API read-only.
- The stopped `root` project publishes 5432/6379 with `user`/`password`. Fine
  while stopped; delete the file so it can never start.

## VPS 2 — `62.72.58.221`, KVM 2

Web app (`web-app-router` repo) + Supabase. Not touched by phone work.

---

## Appwrite functions (VPS 1)

| id | purpose | timeout |
|---|---|---|
| `tool-executor` | phone → Windmill for tools | 180s |
| `phone-session` | mints an Appwrite session from a Firebase phone login | 15s |
| `chat-ai` | phone chat → Windmill `f/mobile/chat_ai` | 30s |
| `image-generator` | Gemini image model, used by ToolDetailScreen | 120s |
| `delete-account` | account deletion | 15s |
| `stripe-checkout` | billing | 30s |

`phone-session` is fast — 66 executions, all HTTP 200, 0.39s–2.58s. It is not
the cause of slow login.

---

## Phone auth (OTP)

Firebase Phone Auth → `phone-session` → Appwrite session.

Two settings that decide whether OTP works at all, neither visible in code:

- App Check on `identitytoolkit.googleapis.com`. When `ENFORCED`, Android also
  requires Play Integrity `MEETS_DEVICE_INTEGRITY`, which **no emulator,
  sideload or EAS install can satisfy** — only a build installed from Google
  Play. It was enabled 2026-07-14 18:17 UTC and set to `UNENFORCED`
  2026-08-25.
- `smsRegionConfig: {"allowByDefault": {}}` — every country is allowed.

When App Check blocks a request, the Android SDK reports
`auth/unknown … API key expired. Please renew the API key.` **The key is not
expired.** That message cost a key rotation and weeks of misdiagnosis. Check
App Check enforcement before ever touching a Firebase API key again.

Test numbers configured: `+91 9999999999` and `+1 9999999999`, code `123456`.
They still fail while App Check is enforced, because App Check is checked
before the test-number shortcut.

---

## Where the code lives

| what | where |
|---|---|
| phone app | this repo, `src/` |
| web app | `web-app-router` repo (VPS 2) |
| Windmill scripts | **only inside Windmill** — `windmill/` in this repo is the start of a source of truth |
| Appwrite functions | **only inside Appwrite** — no repo |

The last two are the risk. Both are production code with no version control, no
review and no diff. `windmill/f/tools/ai-generate.py` plus
`.github/workflows/windmill-deploy.yml` fix that for Windmill. Appwrite
functions still have no home.

---

## Things that bite, in order of how much time they have cost

1. **Two Windmill entry points.** Always check which one a change affects.
2. **App Check masquerading as an expired API key.** See above.
3. **`npm config omit=dev` on the owner's Mac** — `expo doctor` fails locally
   while CI is green. `npm install --include=dev`.
4. **`expo install --fix` cannot run on npm 11** (`EALLOWSCRIPTS`). Write
   version pins by hand.
5. **git push is blocked** by an enterprise SSH-certificate policy. `gh` works;
   push via the GitHub API (blobs → tree → commit → PATCH ref).
6. **`adb` is not on PATH**, so the rn-mcp-kit device tools report "adb not
   found" and see no emulator. Symlink it into `/opt/homebrew/bin`.
7. **No Xcode on the Mac** — `simctl` does not exist, so iOS cannot be tested
   locally at all.

---

## Rules that already exist

`MOBILE_TOOLS_POLICY.md` governs the phone app. Its core rule: mobile uses the
same backend, models and execution logic as web, and may only shorten the
*display*. As of today the app-side rules are met; the backend ones are not,
because of the two-entry-point problem above.
