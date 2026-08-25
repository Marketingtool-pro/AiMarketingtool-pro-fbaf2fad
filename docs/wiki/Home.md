<div align="center">

# Category-specific Windmill tool UIs

**Technical blueprint &amp; verification checklist**

Replacing one generic execution page with five category templates that still run
real Windmill jobs — and a complete post-output workflow behind a single runtime contract.

![tools](https://img.shields.io/badge/206-tools-7c5cff?style=for-the-badge&labelColor=141227)
![templates](https://img.shields.io/badge/5-templates-a78bfa?style=for-the-badge&labelColor=141227)
![categories](https://img.shields.io/badge/11-categories-7c5cff?style=for-the-badge&labelColor=141227)
![plan](https://img.shields.io/badge/8--week-plan-a78bfa?style=for-the-badge&labelColor=141227)

[**▶ Open the rendered version**](https://marketingtool-pro.github.io/AiMarketingtool-pro-fbaf2fad/tool-ui-blueprint.html) · [App screens](https://marketingtool-pro.github.io/AiMarketingtool-pro-fbaf2fad/app-screens.html) · [Architecture](https://marketingtool-pro.github.io/AiMarketingtool-pro-fbaf2fad/ARCHITECTURE.html)

</div>

---

<table>
<tr>
<td width="33%" valign="top">

**⚙️ WINDMILL**

Synchronous `jobs/run_wait_result` webhooks work, but long-running jobs need
`TIMEOUT_WAIT_RESULT` and `QUEUE_LIMIT_WAIT_RESULT` configured for reliability.

</td>
<td width="33%" valign="top">

**🔑 APPWRITE**

JWTs default to 900s (max 3600s) and die on logout — mint just-in-time, cache
in memory only, retry once on unauthorised.

</td>
<td width="33%" valign="top">

**🚫 HARD CONSTRAINT**

No new colours, no new Tailwind colour tokens. Tailwind changes limited to
keyframes and animation utilities.

</td>
</tr>
</table>

---

## Executive summary

Five category-specific templates replace the single generic tool execution page,
while every tool keeps executing **real Windmill AI jobs** — no mocks — with a full
post-output workflow: copy, PDF, TXT, save, regenerate, share, rate, launch.

The only way this scales across 206 tools is to centralise execution and persistence
into one **runtime contract** — JWT mint/refresh, a `run_wait_result` wrapper,
normalised errors, Appwrite persistence — and keep templates focused on layout,
inputs and preview.

---

## Architecture and runtime contracts

### Windmill execution contract

All tools execute through one endpoint, with body `{ toolSlug, toolName, input, userId }`:

```
POST https://<instance>/api/w/marketingtool/jobs/run_wait_result/f/marketingtool/generate
```

- `TIMEOUT_WAIT_RESULT` defaults to 20 seconds and caps how long the worker waits.
- `QUEUE_LIMIT_WAIT_RESULT` rejects requests when too many jobs are queued.
- Sync endpoints can return HTTP 200 with an error payload unless the script returns `windmill_status_code`.

So the client must carry its own 60s timeout independent of the instance setting, detect body-level errors rather than trusting status alone, and apply structured retries.

### Appwrite JWT lifecycle

`POST /account/jwts` mints on behalf of the current user: 15 minutes valid, 900s default duration, 3600s maximum, rate-limited at 120 requests/minute keyed by URL + user ID.

- Mint immediately before calling Windmill, or reuse a cached token with more than 60s left.
- On 401/403 or an "unauthorised" body: clear the cache, mint fresh, retry once.
- **Never persist the JWT** in `localStorage` or `sessionStorage`.

### Job lifecycle mapped to UI states

Windmill's lifecycle is `queued → running → completed`. Even in sync mode the UI models the run as a job:

`idle` · `validating` · `mintingJwt` · `running` · `succeeded` · `failed` · `saving` · `sharing` · `rating` · `exporting` · `launching`

---

## Error and retry semantics

| Failure class | Detection | User-facing behaviour | Retry rule |
|---|---|---|---|
| JWT mint failure | `createJWT` throws or returns invalid | Hard fail; route to reauth | None — user action required |
| Windmill auth failure | 401/403, or auth in error body | Show error, retry transparently | 1 retry with fresh JWT |
| Wait-result timeout | Fetch abort or instance timeout | "Timed out" + Retry | User-triggered; async later |
| Windmill overload | Immediate rejection at queue limit | "Busy" + retry later | Backoff 5–15s + user retry |
| Appwrite permission denial | 401 on `createDocument` | Explain access/role issue | None until permissions fixed |

---

<details>
<summary><b>Appwrite DB schemas and permissions</b> — click to expand</summary>


Permissions are granted, never default — table level and row level, with row-level rules applying only when Row Security is on. Users can only grant permissions they hold themselves.

| Collection | Required fields | Permissions strategy |
|---|---|---|
| `generations` | userId, toolSlug, toolName, categoryId, templateId, input, outputMarkdown, outputStructured?, createdAt, parentGenerationId?, windmillMeta? | Row security on; owner-only read/update/delete; explicit permission array on create |
| `shares` | publicId, generationId, createdBy, expiresAt?, viewCount | Row security on; generations stay private — the share page resolves through a controlled lookup, not public read |
| `ratings` | generationId, toolSlug, userId, stars?, thumb?, comment?, createdAt | Row security on; deterministic doc id `${generationId}_${userId}` prevents duplicates |
| `campaigns` | userId, platform, draftPayload, status, launchRef?, createdAt | Row security on; launch is a job with visible status and failure reasons |

</details>

---


## UI architecture

### The five templates

Template boundaries are strict: layout, input-schema rendering and preview only. Every backend operation goes through the runtime hook.

| Template | Categories | Primary UI responsibility |
|---|---|---|
| `AdCampaignLayout` | Google Ads, Meta/Facebook | Wizard steps, live preview, launch |
| `SocialContentLayout` | Instagram, Video Marketing | Content editor, hashtag cloud, visual preview, schedule |
| `ContentWriterLayout` | Content Writing, Email Marketing | Document workspace, analysis panel |
| `SEOAnalyticsLayout` | SEO, Analytics, Automation | Audit dashboard: scores, checklist, recommendations |
| `CommerceCreativeLayout` | E-commerce/Shopify, Creative Studio | Product preview, variants, structured export |

### Shared pieces

**`ToolExecution` router** — a thin router: read `toolSlug`, load the tool definition, select the template via `CATEGORY_TEMPLATE_MAP`, provide the runtime, render "not found" for unknown slugs.

**`useToolRuntime()`** — one service exposing `runTool`, `saveGeneration`, `regenerate`, `createShare`, `rateGeneration`, `launchCampaign` and the export helpers.

**`MarkdownRenderer`** — H1–H4, lists, bold, inline and block code, copy fidelity preserved, and auto-collapse for large outputs.

### OutputToolbar — where a run finishes

| Action | UI behaviour | Backend dependency |
|---|---|---|
| Copy | Copy all or one section | None |
| PDF | Print CSS, html2canvas fallback | Optional export event later |
| TXT | Download a `.txt` | None |
| Save | Persist the generation | Appwrite `generations` |
| Regenerate | Re-run with the same input | Windmill + new generation doc |
| Share | Create a share link | Appwrite `shares` + `/share/:publicId` |
| Rate | Stars or thumb | Appwrite `ratings` |
| Launch | Create a draft/queued campaign | Appwrite `campaigns` + optional Windmill flow |

---

## Execution flow

```
Route /tool/:toolSlug
  └─ Load toolDef (index + category JSON)
      └─ Select template by categoryId
          AdCampaign · SocialContent · ContentWriter · SEOAnalytics · CommerceCreative
              └─ Input + preview state
                  └─ Appwrite createJWT
                      └─ POST run_wait_result
                          └─ Normalise result / error
                              └─ MarkdownRenderer
                                  ├─ Copy / TXT / PDF
                                  ├─ Save      → generations
                                  ├─ Regenerate
                                  ├─ Share     → shares
                                  ├─ Rate      → ratings
                                  └─ Launch    → campaigns
```

---

## Data and performance plan

Cut the 326KB catalogue load to a small index plus on-demand category JSON: `toolIndex.ts` (~15KB) maps slug → category and file; eleven per-category JSON files hold the full definitions, dynamically imported when a tool opens and cached in memory. Vite's `build.rollupOptions.output.manualChunks` controls the split.

| Asset | Budget | Rationale |
|---|---|---|
| Initial catalogue index | ≤ 20KB | Fast initial route render |
| Per-category tool JSON | ≤ 40KB | Acceptable per-navigation cost |
| Tool output payload | < 500KB markdown | Render, copy and export stay stable |

Large outputs auto-collapse with download offered instead of full expansion; store full markdown in `generations` and a preview field for list screens; page listings deliberately with `Query.limit()` — Appwrite defaults to 25 and degrades on large pages.

---

<details>
<summary><b>Verification and QA</b> — click to expand</summary>


### Test matrix

- **Unit — JWT**: cache hit, near-expiry refresh, mint failure, single retry on unauthorised
- **Unit — Windmill wrapper**: timeout abort, body-level error normalisation, queue-busy mapping, success parsing
- **Unit — OutputToolbar**: idle/loading/success/failure per action, disabled until output exists
- **Unit — MarkdownRenderer**: headings, lists, code blocks, huge-output collapse, safe links
- **E2E smoke** — one tool per category (11): run → render → save
- **E2E ads** — Google and Meta wizard → generate → launch writes a `campaigns` record

### Gates and targets

- Typecheck and unit tests
- Storybook build with `a11y.test='error'` for core components
- Visual tests via the Chromatic addon
- E2E smoke, one tool per category
- **≥80** Performance · **≥90** Accessibility · **≥90** Best practices

Pre-release smoke runs in staging against real Windmill AI: one tool per category, then copy, TXT, PDF, save with owner-only permissions, regenerate linked to its parent, a share link that resolves, and a persisted rating.

</details>

---

<details>
<summary><b>Deployment and ops</b> — click to expand</summary>


**Appwrite Sites** — deploy via `appwrite init sites` then `appwrite push sites`, configured through `appwrite.config.json`. Deployments move through `waiting → processing → building → ready → active`, and any ready deployment can be activated — which is also the instant, zero-downtime rollback path. Always keep one known-good ready deployment before activating a new one.

**Windmill resilience** — variables are encrypted with a workspace key; secrets can't be read outside scripts and every decrypt is audit-logged. Manage load with `TIMEOUT_WAIT_RESULT` and `QUEUE_LIMIT_WAIT_RESULT`, protect downstream APIs with concurrency limits, and optionally debounce repeated generate clicks by key and delay window.

</details>

---

<details>
<summary><b>Risks and acceptance criteria</b> — click to expand</summary>


| Risk | Impact | Mitigation |
|---|---|---|
| JWT expiry / logout invalidation | Tool runs fail | Just-in-time minting, in-memory cache, single retry on 401/403 |
| Sync timeout (20s default) | Long tools fail | Raise the instance timeout prudently; move heavy tools async later |
| Queue overload | Requests rejected | Configure the queue limit, show "busy, retry later", consider dedicated workers |
| Body-level errors with HTTP 200 | Silent failures | Normalise on the body; return `windmill_status_code` from scripts |
| Appwrite data leakage | Critical | Row security on, explicit permissions, controlled share view |
| Platform rate limits on launch | Launch fails | Model launch as a job with retries; apply concurrency limits |
| PDF export brittleness | UX defects | Print CSS first; html2canvas only when needed; no cross-origin assets in capture |

### Acceptance criteria by phase

- **Phase 0** — no new hex values beyond the permitted palette and existing inline platform accents; no new Tailwind colours, keyframes only.
- **Phase 1** — the router sends every category to the right template; one tool per category runs with real Windmill output.
- **Phase 2** — every OutputToolbar action works across all templates and persists with correct permissions, no cross-user access.
- **Phase 3** — `AdCampaignLayout` covers Google and Meta fields with live preview, and launch creates a campaign record with status.
- **Phase 4** — catalogue split to a 15–20KB index plus on-demand loads; large outputs never lock the UI.

</details>

---


## Prioritised plan

| Priority | Work item | Estimate |
|---|---|---|
| P0 | Shared runtime: JWT + Windmill wrapper + error normalisation | 1.5–2.5 pw |
| P0 | Shared components: MarkdownRenderer, OutputToolbar, EmptyState | 1.5–2.5 pw |
| P1 | Five schema-driven templates + ToolExecution router rewrite | 3.5–6 pw |
| P1 | Appwrite collections, row security, permissions, share access strategy | 1–2 pw |
| P2 | AdsCreator merge, live preview, launch artefacts | 2–3 pw |
| P2 | Catalogue split, lazy loading, caching, chunk tuning | 1–1.5 pw |
| P2 | QA gates: Storybook coverage, a11y, visual tests, E2E smoke | 2–3 pw |
| P3 | Hardening: queue limits, timeouts, concurrency, debouncing | 1–2 pw |

### Milestones

| Weeks | Work |
|---|---|
| 1–2 | P0 runtime core + DB schemas and permissions baseline |
| 2–3 | P0 shared components |
| 3–6 | P1 templates, router, per-category UX |
| 5–7 | P2 AdsCreator enhancement + launch artefacts |
| 6–8 | P2 catalogue split, chunk tuning, QA gates |
| 8 | P3 hardening, rollout, rollback readiness |

---

## Open questions before Phase 0

Four things in the source blueprint don't hold up against the repository as it stands. Each needs an owner decision, not a code change.

**Tool count: 206 or 314?**
The blueprint scopes 206 tools; `src/data/tools.js` and `toolsStore.ts` carry 314. The template mapping has to cover whichever number is canonical, or ~108 tools land on no template.

**11 categories or 21?**
`TOOL_CATEGORIES` defines 21 ids (including tiktok, youtube, linkedin, twitter, pinterest, copywriting) — the five templates map only 11. Decide whether the extras fold into an existing template or the map needs a documented default.

**Does the mobile app follow?**
The blueprint is web-only (Tailwind, Vite, Storybook), but the phone app renders every tool through one generic `ToolDetailScreen`. Either mobile keeps the generic form — and the two clients diverge per tool — or the five-template idea needs a native counterpart in scope.

**A 60s client timeout over a 20s server cap**
As specified, the instance gives up at 20s while the UI waits 60s — users stare at a spinner for 40 seconds after the job is already dead. Raise `TIMEOUT_WAIT_RESULT` first, or drop the client timeout to match it.

---

## Related

- [ARCHITECTURE.md](https://github.com/Marketingtool-pro/AiMarketingtool-pro-fbaf2fad/blob/Master/ARCHITECTURE.md) — how the system fits together today
- [MOBILE_TOOLS_POLICY.md](https://github.com/Marketingtool-pro/AiMarketingtool-pro-fbaf2fad/blob/Master/MOBILE_TOOLS_POLICY.md) — rules the phone app must follow
- [App Screens](https://marketingtool-pro.github.io/AiMarketingtool-pro-fbaf2fad/app-screens.html) · [Project Page](https://marketingtool-pro.github.io/AiMarketingtool-pro-fbaf2fad/project-page.html) · [Tool UI Blueprint (rendered)](https://marketingtool-pro.github.io/AiMarketingtool-pro-fbaf2fad/tool-ui-blueprint.html)

<sub>Reference docs: Windmill (webhooks, jobs, environment variables, concurrency limits, variables and secrets) · Appwrite (account, database permissions, pagination, Sites) · Tailwind animation · Storybook testing · Vite build · MDN print events · html2canvas.</sub>

---

<div align="center">

**[▶ View this as the fully rendered page](https://marketingtool-pro.github.io/AiMarketingtool-pro-fbaf2fad/tool-ui-blueprint.html)**

<sub>The wiki shows the content; the Pages site shows the design. GitHub wikis cannot execute JavaScript, so the interactive version lives there.</sub>

</div>
