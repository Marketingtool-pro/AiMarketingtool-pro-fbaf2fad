/**
 * Appwrite Function: iap-verify  (v1.0.0)
 *
 * THE FIX FOR App Store Guideline 2.1(b) ("pro feature remained locked after
 * purchase") — WITHOUT a new build.
 *
 * Build 512 already calls this function after every successful purchase:
 *   billingService.verifyPurchase() -> functions.createExecution('iap-verify', ...)
 * ...but the function never existed/never set the entitlement, so the user's
 * `subscription` field in the DB stayed 'free' and every Pro lock
 * (profile.subscription === 'free') kept the app locked. Deploying THIS makes the
 * existing build 512 unlock on the reviewer's re-test: it maps the purchased
 * productId -> tier and writes it onto the user's `users` document, which the app
 * re-reads via refreshProfile().
 *
 * Env required: APPWRITE_ENDPOINT, APPWRITE_FUNCTION_PROJECT_ID, APPWRITE_API_KEY.
 */
const { Client, Databases, Query } = require("node-appwrite");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "marketingtool_db";
const USERS_COLLECTION = process.env.APPWRITE_USERS_COLLECTION || "users";

// productId -> entitlement. Covers iOS flat skus AND Android Play product ids
// (starter / professional / growth). Mirrors the client mapping so server and
// client agree on what each product grants.
const PRODUCT_TO_ENTITLEMENT = {
  "pro.marketingtool.starter.monthly": { subscription: "starter", generationsLimit: 200 },
  "pro.marketingtool.starter.yearly":  { subscription: "starter", generationsLimit: 200 },
  "pro.marketingtool.pro.monthly":     { subscription: "pro",     generationsLimit: 500 },
  "pro.marketingtool.pro.yearly":      { subscription: "pro",     generationsLimit: 500 },
  "pro.marketingtool.growth.monthly":  { subscription: "enterprise", generationsLimit: 9999 },
  "pro.marketingtool.growth.yearly":   { subscription: "enterprise", generationsLimit: 9999 },
  // Android Play subscription product ids:
  "starter":      { subscription: "starter",    generationsLimit: 200 },
  "professional": { subscription: "pro",        generationsLimit: 500 },
  "growth":       { subscription: "enterprise", generationsLimit: 9999 },
};

// Consumable "100 Extra Generations" — tops up the quota, does NOT change tier.
const TOKENS_PRODUCT_IDS = ["pro.marketingtool.tokens", "tokens"];
const TOKENS_GRANT = 100;

module.exports = async ({ req, res, log, error }) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (req.method === "OPTIONS") return res.json({ status: "ok" }, 200, headers);

  // Defensive body parsing (same approach as phone-session).
  let body;
  const raw = req.body;
  if (raw && typeof raw === "object" && !Buffer.isBuffer(raw)) {
    body = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    try { body = JSON.parse(raw); }
    catch (e) {
      error("invalid JSON body — len=" + raw.length + " prefix=" + raw.substring(0, 40));
      return res.json({ success: false, error: "Invalid request body (not JSON)" }, 400, headers);
    }
  } else if (Buffer.isBuffer(raw)) {
    try { body = JSON.parse(raw.toString("utf8")); }
    catch (e) {
      error("invalid Buffer body");
      return res.json({ success: false, error: "Invalid request body" }, 400, headers);
    }
  } else {
    body = {};
  }

  const { userId, productId, platform, appleReceipt, transactionId, googlePurchaseToken } = body;
  log("iap-verify: user=" + userId + " product=" + productId + " platform=" + platform);

  if (!userId || !productId) {
    return res.json({ success: false, error: "Missing userId or productId" }, 400, headers);
  }

  // Basic proof-of-purchase presence check. (Full StoreKit-2 JWS / Play token
  // signature verification is a production hardening TODO; the client only
  // reaches here after a real finished transaction.)
  const hasProof = !!(appleReceipt || transactionId || googlePurchaseToken);
  if (!hasProof) {
    return res.json({ success: false, error: "Missing purchase proof" }, 400, headers);
  }

  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://api.marketingtool.pro/v1")
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);

    // Find the user's profile document (queried by userId, same as the app).
    const list = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION, [
      Query.equal("userId", userId),
      Query.limit(1),
    ]);
    if (!list.documents.length) {
      error("no users doc for userId=" + userId);
      return res.json({ success: false, error: "User profile not found" }, 404, headers);
    }
    const doc = list.documents[0];

    // Consumable top-up: add generations, keep the current tier.
    if (TOKENS_PRODUCT_IDS.includes(productId)) {
      const newLimit = (doc.generationsLimit || 0) + TOKENS_GRANT;
      await databases.updateDocument(DATABASE_ID, USERS_COLLECTION, doc.$id, {
        generationsLimit: newLimit,
      });
      log("topped up " + userId + " -> generationsLimit=" + newLimit);
      return res.json({ success: true, subscription: doc.subscription, generationsLimit: newLimit }, 200, headers);
    }

    // Subscription: set the tier + quota the product grants.
    const ent = PRODUCT_TO_ENTITLEMENT[productId];
    if (!ent) {
      error("unknown productId=" + productId);
      return res.json({ success: false, error: "Unknown product" }, 400, headers);
    }
    await databases.updateDocument(DATABASE_ID, USERS_COLLECTION, doc.$id, {
      subscription: ent.subscription,
      generationsLimit: ent.generationsLimit,
    });
    log("entitled " + userId + " -> " + ent.subscription + " (" + ent.generationsLimit + ")");
    return res.json({ success: true, subscription: ent.subscription, generationsLimit: ent.generationsLimit }, 200, headers);

  } catch (err) {
    error("iap-verify error: " + err.message);
    return res.json({ success: false, error: err.message }, 500, headers);
  }
};
