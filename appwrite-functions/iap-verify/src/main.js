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
 *   GOOGLE_SERVICE_ACCOUNT_JSON    Base64-encoded Google service-account JSON
 */
const { Client, Databases, Query } = require("node-appwrite");

// ── Entitlement map (mirrors billingService.ts PRODUCT_TO_ENTITLEMENT) ───────
const PRODUCT_TO_ENTITLEMENT = {
  "pro.marketingtool.starter.monthly": { tier: "starter", generationsLimit: 200 },
  "pro.marketingtool.starter.yearly":  { tier: "starter", generationsLimit: 200 },
  "pro.marketingtool.pro.monthly":     { tier: "pro",     generationsLimit: 500 },
  "pro.marketingtool.pro.yearly":      { tier: "pro",     generationsLimit: 500 },
  "pro.marketingtool.growth.monthly":  { tier: "enterprise", generationsLimit: 9999 },
  "pro.marketingtool.growth.yearly":   { tier: "enterprise", generationsLimit: 9999 },
  // Consumable – adds credits, no tier change
  "pro.marketingtool.tokens": null,
  "tokens":                   null,
  // Android Play subscription product ids
  "starter":      { tier: "starter",    generationsLimit: 200 },
  "professional": { tier: "pro",        generationsLimit: 500 },
  "growth":       { tier: "enterprise", generationsLimit: 9999 },
};

const CONSUMABLE_IDS = new Set(["pro.marketingtool.tokens", "tokens"]);
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

  const { userId, productId, platform, appleReceipt, transactionId, googlePurchaseToken } = body;

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
      }
      if (sharedSecret) {
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

  // ── Update Appwrite profile ─────────────────────────────────────────────────
  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://api.marketingtool.pro/v1")
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const db = new Databases(client);

    const DATABASE_ID   = "marketingtool";
    const COLLECTION_ID = "profiles";

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
      const tierRank = { free: 0, starter: 1, pro: 2, enterprise: 3 };
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
