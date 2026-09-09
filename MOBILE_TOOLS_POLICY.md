---
layout: default
title: "Mobile Tools Execution & Result Display"
description: "Same backend, models and execution logic as web. Display may be shortened — nothing else."
---

# Mobile Tools Execution & Result Display (Final)

## Mobile Tools Functionality

### Core Rule
All tools available on the web are also available on mobile using the same backend, AI models, and execution logic.

Mobile devices do not use demo or sample tools. Tool execution is identical across platforms.

---

## Tool Execution Flow (Mobile)

1. User selects a tool
2. Inputs are submitted from mobile
3. Tool executes fully via backend (same as web)
4. Result is stored in history
5. Mobile displays output based on size and readability

Execution is never blocked based on device type.

---

## Mobile Result Display – Extended Guidelines

### Why Mobile Results May Be Shorter
Mobile devices have smaller screens and limited reading space.
Some tools generate very long outputs that are difficult to read comfortably on a phone.

For these cases, the mobile app shows a preview or summary while keeping the full result available on desktop.

This improves usability without limiting functionality.

---

## What Is NOT Changed on Mobile
- Tool execution logic
- AI models used
- Output quality
- Data stored in history
- User entitlements or billing

All tools run using the same backend on all platforms.

---

## User Trust & Transparency Rules (Mandatory)
The mobile app must always:
- Clearly state when a preview is shown
- Provide a visible option to access the full result
- Avoid language like "not supported" or "mobile-only limitation"
- Never auto-block or silently truncate results

---

## Recommended Mobile Actions for Long Results
When a tool output is marked as large:
- Show a short preview (first lines)
- Provide a visible "Show full result" toggle that expands the COMPLETE
  output inline, on-device (and a "Collapse" toggle to re-hide it)
- Keep Copy / Share / Save available for the full result

NOTE (2026-06-28, owner decision; URL corrected 2026-07-04): BOTH are provided.
The full result is shown inline on the phone (preview + "Show full result"), AND
a "View Full on Desktop" button opens the web app at
`https://app.marketingtool.pro/login` — the entry the marketingtool.pro
"Get Started" funnel uses. The SPA's root "/" and the old `/tools/<slug>` deep
routes both client-render 404 (device-verified 2026-07-04), and fixing web
routing is off-limits here (web-app-router repo / VPS 2) — the phone only links
to the working URL. This satisfies the mandatory trust rules (full result
accessible inline, nothing silently truncated) while keeping the policy-mandated
desktop hand-off the owner wants.

---

## AI Assistant / Chat Agent Behavior
If a user asks why a result looks shorter on mobile, the AI assistant should respond with:

"The tool completed successfully.
This result is long, so we show a preview on mobile for readability.
You can view the full output on desktop anytime."

---

## App Store & Compliance Note
This behavior follows standard SaaS practices:
- No misleading claims
- No hidden functionality
- No artificial limitations

---

## Final Company Position
All tools are fully functional on all platforms.
Mobile displays long results in a summarized format for better readability.
