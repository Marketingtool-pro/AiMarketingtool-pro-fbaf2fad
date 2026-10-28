/**
 * Appwrite Function: iap-verify  (v2.0.0)
 *
 * Verifies App Store / Google Play purchases and updates the Appwrite user
 * profile with the matching subscription tier + generationsLimit, or adds
 * credits for the consumable.
 *
 * v2: the server decides, the app does not.
 *   - The account is the CALLER's, taken from the `x-appwrite-user-id` header
 *     Appwrite sets for an authenticated execution. A `userId` in the body is a
 *     claim, not proof: it is only accepted when it matches the caller.
 *   - Nothing is written unless the store confirms the purchase. Missing
 *     verification config, a failed lookup, a wrong bundle/package, a wrong
 *     product, an expired/revoked subscription or an already-consumed Play
 *     token all leave the profile untouched (fail closed).
 *
 * Request body (POST):
 *   { productId, platform, userId?,
 *     appleReceipt?,          // iOS - StoreKit 2 JWS or legacy app receipt
 *     transactionId?,         // iOS - StoreKit transactionId
 *     googlePurchaseToken? }  // Android
 *
 * Response:
 *   { success: true }  or  { success: false, error: "<reason>" }
 *
 * Env:
 *   APPWRITE_ENDPOINT              (default: https://api.marketingtool.pro/v1)
 *   APPWRITE_FUNCTION_PROJECT_ID   (injected by Appwrite)
 *   APPWRITE_API_KEY               (injected by Appwrite)
 *   APPLE_SHARED_SECRET            App Store shared secret (legacy receipts only)
 *   GOOGLE_SERVICE_ACCOUNT_JSON    Google service-account JSON (raw or base64) with
 *                                  access to the Play Developer API
 *   APP_BUNDLE_ID                  (default: pro.marketingtool.app)
 *   ANDROID_PACKAGE_NAME           (default: pro.marketingtool.app)
 *   APPLE_ROOT_CA_SHA256           (default: Apple Root CA - G3 fingerprint)
 */
const https = require("https");
const crypto = require("crypto");
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
const TOKEN_CREDITS   = 100; // generations added per consumable purchase

const BUNDLE_ID = process.env.APP_BUNDLE_ID || "pro.marketingtool.app";
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE_NAME || "pro.marketingtool.app";
// SHA-256 fingerprint of "Apple Root CA - G3", the root of the StoreKit 2 JWS chain.
const APPLE_ROOT_CA_SHA256 = (
  process.env.APPLE_ROOT_CA_SHA256 ||
  "63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79"
).toUpperCase();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

class VerificationError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.status = status;
  }
}

function header(req, name) {
  const h = (req && req.headers) || {};
  const value = h[name] ?? h[name.toLowerCase()];
  return typeof value === "string" ? value.trim() : "";
}

/** HTTPS request to a fixed host; resolves { status, json }. */
function httpsJson({ hostname, path, method = "GET", headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : Buffer.from(body);
    const r = https.request(
      {
        hostname,
        path,
        method,
        headers: payload ? { ...headers, "Content-Length": payload.length } : headers,
      },
      (resp) => {
        let data = "";
        resp.on("data", (chunk) => (data += chunk));
        resp.on("end", () => {
          let json = {};
          try { json = data ? JSON.parse(data) : {}; } catch { json = {}; }
          resolve({ status: resp.statusCode, json });
        });
      }
    );
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

// ── Apple ───────────────────────────────────────────────────────────────────

function b64urlJson(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

function looksLikeJws(value) {
  return typeof value === "string" && value.split(".").length === 3;
}

/** StoreKit 2 signed transaction: x5c chain to Apple Root CA - G3, ES256. */
function verifyAppleJws(jws, productId, isConsumable) {
  const [h, p, s] = jws.split(".");
  let headerJson, payload;
  try {
    headerJson = b64urlJson(h);
    payload = b64urlJson(p);
  } catch {
    throw new VerificationError("Malformed App Store transaction");
  }
  if (headerJson.alg !== "ES256") throw new VerificationError("Unexpected App Store signature algorithm");
  const x5c = headerJson.x5c;
  if (!Array.isArray(x5c) || x5c.length < 3) throw new VerificationError("App Store certificate chain missing");

  let leaf, intermediate, root;
  try {
    [leaf, intermediate, root] = x5c.slice(0, 3).map((c) => new crypto.X509Certificate(Buffer.from(c, "base64")));
  } catch {
    throw new VerificationError("App Store certificate chain unreadable");
  }
  if (root.fingerprint256.toUpperCase() !== APPLE_ROOT_CA_SHA256) {
    throw new VerificationError("App Store chain is not rooted at Apple");
  }
  const chainOk =
    root.verify(root.publicKey) &&
    intermediate.checkIssued(root) && intermediate.verify(root.publicKey) &&
    leaf.checkIssued(intermediate) && leaf.verify(intermediate.publicKey);
  if (!chainOk) throw new VerificationError("App Store certificate chain invalid");

  const at = typeof payload.signedDate === "number" ? payload.signedDate : Date.now();
  for (const cert of [leaf, intermediate, root]) {
    if (at < Date.parse(cert.validFrom) || at > Date.parse(cert.validTo)) {
      throw new VerificationError("App Store certificate not valid at signing time");
    }
  }

  const sigOk = crypto.verify(
    "sha256",
    Buffer.from(`${h}.${p}`),
    { key: leaf.publicKey, dsaEncoding: "ieee-p1363" },
    Buffer.from(s, "base64url")
  );
  if (!sigOk) throw new VerificationError("App Store signature invalid");

  if (payload.bundleId !== BUNDLE_ID) throw new VerificationError("Purchase is for a different app");
  if (payload.productId !== productId) throw new VerificationError("Purchase is for a different product");
  if (payload.revocationDate) throw new VerificationError("Purchase was refunded or revoked");
  if (!isConsumable && !(typeof payload.expiresDate === "number" && payload.expiresDate > Date.now())) {
    throw new VerificationError("Subscription is not active");
  }
}

/** Legacy app receipt via verifyReceipt (needs APPLE_SHARED_SECRET). */
async function verifyAppleReceipt(receipt, productId, isConsumable) {
  const sharedSecret = process.env.APPLE_SHARED_SECRET;
  if (!sharedSecret) throw new VerificationError("App Store verification is not configured", 503);

  const body = JSON.stringify({ "receipt-data": receipt, password: sharedSecret, "exclude-old-transactions": true });
  const call = (hostname) =>
    httpsJson({ hostname, path: "/verifyReceipt", method: "POST", headers: { "Content-Type": "application/json" }, body });

  let { json } = await call("buy.itunes.apple.com");
  // 21007 = sandbox receipt sent to production; retry with sandbox
  if (json.status === 21007) ({ json } = await call("sandbox.itunes.apple.com"));
  if (json.status !== 0) throw new VerificationError(`App Store rejected the receipt (status ${json.status})`);
  if (!json.receipt || json.receipt.bundle_id !== BUNDLE_ID) throw new VerificationError("Purchase is for a different app");

  const items = [...(json.latest_receipt_info || []), ...(json.receipt.in_app || [])];
  const now = Date.now();
  const match = items.find(
    (i) =>
      i && i.product_id === productId && !i.cancellation_date &&
      (isConsumable || Number(i.expires_date_ms) > now)
  );
  if (!match) throw new VerificationError(isConsumable ? "Purchase not found in receipt" : "Subscription is not active");
}

// ── Google Play ─────────────────────────────────────────────────────────────

let googleToken = { value: null, expiresAt: 0 };

function serviceAccount() {
  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

async function googleAccessToken() {
  if (googleToken.value && Date.now() < googleToken.expiresAt) return googleToken.value;
  const sa = serviceAccount();
  if (!sa || !sa.client_email || !sa.private_key) {
    throw new VerificationError("Google Play verification is not configured", 503);
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSec,
    exp: nowSec + 3600,
  })}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), sa.private_key).toString("base64url");
  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: `${unsigned}.${signature}`,
  }).toString();

  const { status, json } = await httpsJson({
    hostname: "oauth2.googleapis.com",
    path: "/token",
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (status !== 200 || !json.access_token) throw new VerificationError("Google Play verification unavailable", 503);
  googleToken = { value: json.access_token, expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000 - 60_000 };
  return googleToken.value;
}

async function verifyGooglePurchase(purchaseToken, productId, isConsumable) {
  if (typeof purchaseToken !== "string" || !purchaseToken) throw new VerificationError("Missing purchase token", 400);
  const accessToken = await googleAccessToken();
  const base = `/androidpublisher/v3/applications/${encodeURIComponent(ANDROID_PACKAGE)}/purchases`;
  const path = isConsumable
    ? `${base}/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`
    : `${base}/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;

  const { status, json } = await httpsJson({
    hostname: "androidpublisher.googleapis.com",
    path,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (status !== 200) throw new VerificationError("Google Play could not confirm the purchase");

  if (isConsumable) {
    if (json.purchaseState !== 0) throw new VerificationError("Purchase is not completed");
    // Already consumed = already credited; a replayed token must not add credits again.
    if (json.consumptionState !== 0) throw new VerificationError("Purchase was already redeemed");
  } else {
    const activeStates = new Set(["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"]);
    if (!activeStates.has(json.subscriptionState)) throw new VerificationError("Subscription is not active");
    const lineItems = Array.isArray(json.lineItems) ? json.lineItems : [];
    if (!lineItems.some((li) => li && li.productId === productId)) {
      throw new VerificationError("Purchase is for a different product");
    }
  }
}

// ── Handler ─────────────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  if (req.method === "OPTIONS") return res.json({ status: "ok" }, 200, CORS_HEADERS);
  if (req.method && req.method !== "POST") {
    return res.json({ success: false, error: "Method not allowed" }, 405, CORS_HEADERS);
  }

  // ── Caller identity (set by Appwrite, not by the client) ────────────────────
  const callerId = header(req, "x-appwrite-user-id");
  if (!callerId) {
    return res.json({ success: false, error: "Sign in to verify a purchase" }, 401, CORS_HEADERS);
  }

  // ── Parse request body ──────────────────────────────────────────────────────
  let body;
  const raw = req.body;
  try {
    if (raw && typeof raw === "object" && !Buffer.isBuffer(raw)) body = raw;
    else if (Buffer.isBuffer(raw)) body = JSON.parse(raw.toString("utf8"));
    else if (typeof raw === "string" && raw.trim()) body = JSON.parse(raw);
    else body = {};
  } catch {
    error("invalid JSON body");
    return res.json({ success: false, error: "Invalid request body" }, 400, CORS_HEADERS);
  }

  const { userId: claimedUserId, productId, platform, appleReceipt, googlePurchaseToken } = body || {};

  if (claimedUserId !== undefined && claimedUserId !== callerId) {
    error(`iap-verify: caller ${callerId} sent userId=${claimedUserId}`);
    return res.json({ success: false, error: "Purchase must be verified for your own account" }, 403, CORS_HEADERS);
  }
  if (typeof productId !== "string" || !productId || (platform !== "ios" && platform !== "android")) {
    return res.json({ success: false, error: "Missing required fields: productId, platform" }, 400, CORS_HEADERS);
  }
  const userId = callerId;

  log(`iap-verify: userId=${userId} productId=${productId} platform=${platform}`);

  // ── Resolve entitlement ─────────────────────────────────────────────────────
  if (!Object.prototype.hasOwnProperty.call(PRODUCT_TO_ENTITLEMENT, productId)) {
    error(`Unknown productId: ${productId}`);
    return res.json({ success: false, error: "Unknown productId" }, 400, CORS_HEADERS);
  }
  const entitlement = PRODUCT_TO_ENTITLEMENT[productId];
  const isConsumable = CONSUMABLE_IDS.has(productId);

  // ── Store verification (required; nothing is written without it) ───────────
  try {
    if (platform === "ios") {
      if (typeof appleReceipt !== "string" || !appleReceipt) throw new VerificationError("Missing App Store receipt", 400);
      if (looksLikeJws(appleReceipt)) verifyAppleJws(appleReceipt, productId, isConsumable);
      else await verifyAppleReceipt(appleReceipt, productId, isConsumable);
    } else {
      await verifyGooglePurchase(googlePurchaseToken, productId, isConsumable);
    }
    log(`iap-verify: ${platform} purchase verified for userId=${userId}`);
  } catch (e) {
    const status = e instanceof VerificationError ? e.status : 502;
    error(`iap-verify: verification failed for userId=${userId}: ${e.message}`);
    return res.json(
      { success: false, error: e instanceof VerificationError ? e.message : "Purchase could not be verified" },
      status,
      CORS_HEADERS
    );
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
    // Purchase validation succeeded, but persistence failed.
    // Return an explicit partial failure so clients/monitoring can detect it.
    return res.json(
      { success: false, partialFailure: true, note: "profile update failed; entitlement applied client-side" },
      500,
      CORS_HEADERS
    );
  }
};
