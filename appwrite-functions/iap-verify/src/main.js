/**
 * Appwrite Function: iap-verify  (v1.0.0)
 *
 * Verifies App Store / Google Play receipts and updates the Appwrite user
 * profile with the correct subscription tier + generationsLimit.
 *
 * Called by billingService.verifyPurchase() after a StoreKit/Play purchase
 * lands in the purchaseUpdatedListener. The entitlement is already applied
 * locally on the client; this function syncs it server-side so the profile
 * is accurate on next login / fetchOrCreateProfile.
 *
 * Request body (POST):
 *   { userId, productId, platform,
 *     appleReceipt?,   // iOS  – jwsRepresentation or transactionReceipt
 *     transactionId?,  // iOS  – StoreKit transactionId
 *     googlePurchaseToken? }  // Android
 *
 * Response:
 *   { success: true }  or  { success: false, error: "<reason>" }
 *
 * Env:
 *   APPWRITE_ENDPOINT              (default: https://api.marketingtool.pro/v1)
 *   APPWRITE_FUNCTION_PROJECT_ID   (injected by Appwrite)
 *   APPWRITE_API_KEY               (injected by Appwrite)
 *   APPLE_SHARED_SECRET            App Store shared secret for receipt validation
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON  Play service-account JSON (raw or base64).
 *                                  GOOGLE_SERVICE_ACCOUNT_JSON also accepted.
 *   ANDROID_PACKAGE_NAME           defaults to pro.marketingtool.app
 */
const { Client, Databases, Query } = require("node-appwrite");

// ── Entitlement map (mirrors billingService.ts PRODUCT_TO_ENTITLEMENT) ───────
const PRODUCT_TO_ENTITLEMENT = {
  "pro.marketingtool.starter.monthly": { tier: "starter", generationsLimit: 200 },
  "pro.marketingtool.starter.yearly":  { tier: "starter", generationsLimit: 200 },
  "pro.marketingtool.pro.monthly":     { tier: "pro",     generationsLimit: 500 },
  "pro.marketingtool.pro.yearly":      { tier: "pro",     generationsLimit: 500 },
  "pro.marketingtool.growth.monthly":  { tier: "growth", generationsLimit: 9999 },
  "pro.marketingtool.growth.yearly":   { tier: "growth", generationsLimit: 9999 },
  // Consumable – adds credits, no tier change
  "pro.marketingtool.tokens": null,
  "tokens":                   null,
  // Android Play subscription product ids
  "starter":      { tier: "starter", generationsLimit: 200 },
  "professional": { tier: "pro",     generationsLimit: 500 },
  "growth":       { tier: "growth",  generationsLimit: 9999 },
};

const CONSUMABLE_IDS = new Set(["pro.marketingtool.tokens", "tokens"]);

// ── Google Play verification ────────────────────────────────────────────────
// Android purchases were never verified: the client has always sent
// `googlePurchaseToken`, but nothing here read it. The Play Developer API
// (androidpublisher.googleapis.com) is enabled on the project and its
// SubscriptionPurchases quota shows 0 calls and a 0 seven-day peak, which is
// the same thing observed from Google's side.
//
// Mirrors the Apple path: best-effort and NON-BLOCKING. The entitlement is
// already applied on the client, so a verification that cannot run must not
// strand a real paying customer. What it does add is a real signal in the logs
// (and a refusal path later, once the data says it is safe to enforce).
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const ANDROID_PUBLISHER_HOST = "androidpublisher.googleapis.com";

function httpsJson(options, body) {
  const https = require("https");
  return new Promise((resolve, reject) => {
    const req = https.request(options, (resp) => {
      let data = "";
      resp.on("data", (c) => (data += c));
      resp.on("end", () => {
        let parsed = {};
        try { parsed = JSON.parse(data); } catch { /* non-JSON */ }
        resolve({ status: resp.statusCode, body: parsed });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

/** Read the service account from either env var name that has been used here. */
function readServiceAccount() {
  const raw =
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    // Accept both raw JSON and the base64 form the docblock describes.
    const text = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(text);
    return parsed.client_email && parsed.private_key ? parsed : null;
  } catch {
    return null;
  }
}

/** Service-account JWT -> OAuth access token for the Play Developer API. */
async function getPlayAccessToken(sa) {
  const crypto = require("crypto");
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");

  const claim = b64({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  });
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${claim}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsigned)
    .sign(sa.private_key, "base64url");

  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: `${unsigned}.${signature}`,
  }).toString();

  const { status, body } = await httpsJson(
    {
      hostname: "oauth2.googleapis.com",
      path: "/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(form),
      },
    },
    form,
  );
  if (status !== 200 || !body.access_token) {
    throw new Error(`token endpoint returned ${status} ${body.error || ""}`.trim());
  }
  return body.access_token;
}

/**
 * Verify a Play purchase token.
 * Returns { ok, state } — ok=true means Google confirmed it is a live purchase.
 * Subscriptions use subscriptionsv2, which is keyed by token alone and so is
 * correct for base-plan subscriptions (where productId is the subscription id).
 */
async function verifyGooglePlay(packageName, productId, purchaseToken, isConsumable, accessToken) {
  const path = isConsumable
    ? `/androidpublisher/v3/applications/${packageName}/purchases/products/` +
      `${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`
    : `/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/` +
      `${encodeURIComponent(purchaseToken)}`;

  const { status, body } = await httpsJson({
    hostname: ANDROID_PUBLISHER_HOST,
    path,
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (status !== 200) {
    return { ok: false, state: `HTTP ${status} ${body?.error?.message || ""}`.trim() };
  }
  if (isConsumable) {
    // purchaseState: 0 = purchased, 1 = cancelled, 2 = pending
    return { ok: body.purchaseState === 0, state: `purchaseState=${body.purchaseState}` };
  }
  const state = body.subscriptionState;
  const live =
    state === "SUBSCRIPTION_STATE_ACTIVE" ||
    state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" ||
    state === "SUBSCRIPTION_STATE_CANCELED"; // cancelled but still paid through
  return { ok: live, state: String(state) };
}

const TOKEN_CREDITS   = 100; // generations added per consumable purchase

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

module.exports = async ({ req, res, log, error }) => {
  if (req.method === "OPTIONS") return res.json({ status: "ok" }, 200, CORS_HEADERS);

  // ── Parse request body ──────────────────────────────────────────────────────
  let body;
  const raw = req.body;
  if (raw && typeof raw === "object" && !Buffer.isBuffer(raw)) {
    body = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    try { body = JSON.parse(raw); }
    catch (e) {
      error("invalid JSON body");
      return res.json({ success: false, error: "Invalid request body" }, 400, CORS_HEADERS);
    }
  } else if (Buffer.isBuffer(raw)) {
    try { body = JSON.parse(raw.toString("utf8")); }
    catch (e) { return res.json({ success: false, error: "Invalid request body" }, 400, CORS_HEADERS); }
  } else {
    body = {};
  }

const { userId, productId, platform, appleReceipt, googlePurchaseToken } =
    body || {};

  if (!userId || !productId || !platform) {
    return res.json({ success: false, error: "Missing required fields: userId, productId, platform" }, 400, CORS_HEADERS);
  }

  log(`iap-verify: userId=${userId} productId=${productId} platform=${platform}`);

  // ── Resolve entitlement ─────────────────────────────────────────────────────
  const entitlement = PRODUCT_TO_ENTITLEMENT[productId];
  const isConsumable = CONSUMABLE_IDS.has(productId);

  if (entitlement === undefined) {
    error(`Unknown productId: ${productId}`);
    return res.json({ success: false, error: `Unknown productId: ${productId}` }, 400, CORS_HEADERS);
  }

  // ── Receipt validation (best-effort; local entitlement already applied) ────
  // Apple receipt validation
  if (platform === "ios" && appleReceipt) {
    try {
      const sharedSecret = process.env.APPLE_SHARED_SECRET;
      if (!sharedSecret) {
        log("WARNING: APPLE_SHARED_SECRET not configured — skipping server-side receipt validation");
      } else {
        const verifyUrl = "https://buy.itunes.apple.com/verifyReceipt";
        const sandboxUrl = "https://sandbox.itunes.apple.com/verifyReceipt";
        const payload = JSON.stringify({ "receipt-data": appleReceipt, password: sharedSecret });

        const verifyReceipt = async (url) => {
          const https = require("https");
          return new Promise((resolve, reject) => {
            const parsed = new URL(url);
            const reqOptions = { hostname: parsed.hostname, path: parsed.pathname, method: "POST",
              headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } };
            const r = https.request(reqOptions, (resp) => {
              let data = "";
              resp.on("data", (chunk) => data += chunk);
              resp.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
            });
            r.on("error", reject);
            r.write(payload);
            r.end();
          });
        };

        let result = await verifyReceipt(verifyUrl);
        // status 21007 = sandbox receipt sent to production; retry with sandbox
        if (result.status === 21007) result = await verifyReceipt(sandboxUrl);
        if (result.status !== 0) {
          log(`Apple receipt validation returned status ${result.status} — proceeding with local entitlement`);
        } else {
          log("Apple receipt validation: OK");
        }
      }
    } catch (e) {
      log(`Apple receipt validation failed (non-blocking): ${e.message}`);
    }
  }

  // Google Play validation (best-effort; local entitlement already applied)
  if (platform === "android" && googlePurchaseToken) {
    try {
      const sa = readServiceAccount();
      const packageName = process.env.ANDROID_PACKAGE_NAME || "pro.marketingtool.app";
      if (!sa) {
        log(
          "WARNING: no Play service account configured " +
            "(GOOGLE_PLAY_SERVICE_ACCOUNT_JSON / GOOGLE_SERVICE_ACCOUNT_JSON) — " +
            "skipping Play validation",
        );
      } else {
        const accessToken = await getPlayAccessToken(sa);
        const { ok, state } = await verifyGooglePlay(
          packageName,
          productId,
          googlePurchaseToken,
          isConsumable,
          accessToken,
        );
        log(`Play validation: ok=${ok} ${state}`);
      }
    } catch (e) {
      log(`Play validation failed (non-blocking): ${e.message}`);
    }
  }

  // ── Update Appwrite profile ─────────────────────────────────────────────────
  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://api.marketingtool.pro/v1")
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const db = new Databases(client);

    // Verified against the live Appwrite project on 2026-09-18: the database is
    // `main` and the profile collection is `users`. There is no `marketingtool`
    // database and no `profiles` collection, so the previous constants made every
    // updateDocument here fail with "Database not found" — the purchase would
    // validate and then never be recorded.
    //
    // This is the SAME defect already fixed once on the client: see the comment in
    // src/services/appwrite.ts, where DATABASE_ID was wrongly 'marketingtool_db'
    // and that was "the real reason credits never showed and plans never unlocked
    // after purchase". Keep these two in step with COLLECTIONS.USERS there.
    const DATABASE_ID   = "main";
    const COLLECTION_ID = "users";

    const existing = await db.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("userId", userId),
    ]);

    if (existing.documents.length === 0) {
      log(`Profile not found for userId=${userId} — skipping update`);
      return res.json({ success: true, note: "profile not found; entitlement applied client-side" }, 200, CORS_HEADERS);
    }

    const doc = existing.documents[0];
    const updates = {};

    if (isConsumable) {
      // Add credits to existing balance
      const currentCredits = doc.credits ?? 0;
      updates.credits = currentCredits + TOKEN_CREDITS;
      log(`Consumable: adding ${TOKEN_CREDITS} credits to userId=${userId} (was ${currentCredits})`);
    } else if (entitlement) {
      // Subscription: upgrade tier if new tier is higher
      // Mirror billingService.ts TIER_RANK so a Play `growth` purchase is not
      // dropped as an "invalid tier mapping" (growth was previously absent here).
      const tierRank = { free: 0, starter: 1, pro: 2, growth: 3, enterprise: 4 };
      const hasCurrentTier = Object.prototype.hasOwnProperty.call(tierRank, doc.subscription);
      const hasNewTier = Object.prototype.hasOwnProperty.call(tierRank, entitlement.tier);

      if (!hasCurrentTier || !hasNewTier) {
        log(`Subscription: invalid tier mapping for userId=${userId} (current=${doc.subscription}, incoming=${entitlement.tier}) — skipping tier update`);
      } else {
        const currentRank = tierRank[doc.subscription];
        const newRank     = tierRank[entitlement.tier];
        if (newRank >= currentRank) {
          updates.subscription      = entitlement.tier;
          updates.generationsLimit  = entitlement.generationsLimit;
          log(`Subscription: updating userId=${userId} to tier=${entitlement.tier}`);
        } else {
          log(`Subscription: userId=${userId} already on higher tier ${doc.subscription} — skipping downgrade`);
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, updates);
      log(`Profile updated for userId=${userId}: ${JSON.stringify(updates)}`);
    }

    return res.json({ success: true }, 200, CORS_HEADERS);
  } catch (err) {
    error(`iap-verify DB update error: ${err.message}`);
    // Purchase validation may have succeeded, but persistence failed.
    // Return an explicit partial failure so clients/monitoring can detect it.
    return res.json(
      { success: false, partialFailure: true, note: "profile update failed; entitlement applied client-side" },
      500,
      CORS_HEADERS
    );
  }
};
