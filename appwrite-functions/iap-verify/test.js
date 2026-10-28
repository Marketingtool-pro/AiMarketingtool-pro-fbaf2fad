// Exercise iap-verify without Appwrite or the stores. node-appwrite and https
// are stubbed: the profile must only be written for the caller's own account
// and only after the store confirmed the purchase.
const Module = require("module");
const crypto = require("crypto");
const { EventEmitter } = require("events");
const origLoad = Module._load;

let dbWrites = [];
let routes = {}; // "host path" -> { status, json }
const PROFILE = { $id: "doc1", userId: "user_a", subscription: "free", credits: 5 };

Module._load = function (request, ...rest) {
  if (request === "https") {
    return {
      request(opts, cb) {
        const key = Object.keys(routes).find((k) => `${opts.hostname} ${opts.path}`.startsWith(k));
        const route = key ? routes[key] : { status: 404, json: {} };
        const r = new EventEmitter();
        r.write = () => {};
        r.end = () => process.nextTick(() => {
          const resp = new EventEmitter();
          resp.statusCode = route.status;
          cb(resp);
          resp.emit("data", JSON.stringify(route.json));
          resp.emit("end");
        });
        return r;
      },
    };
  }
  if (request === "node-appwrite") {
    class Client { setEndpoint() { return this; } setProject() { return this; } setKey() { return this; } }
    class Databases {
      async listDocuments(_db, _col, q) { return { documents: q[0].includes("user_a") ? [PROFILE] : [] }; }
      async updateDocument(_db, _col, id, updates) { dbWrites.push({ id, updates }); }
    }
    return { Client, Databases, Query: { equal: (k, v) => `${k}=${v}` } };
  }
  return origLoad.call(this, request, ...rest);
};

const handler = require("./src/main.js");

async function call(body, headers = { "x-appwrite-user-id": "user_a" }) {
  let out;
  const res = { json: (b, status) => (out = { status, body: b }) };
  await handler({ req: { method: "POST", headers, body: JSON.stringify(body) }, res, log() {}, error() {} });
  return out;
}

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}`);
  if (!cond) failures++;
}

(async () => {
  const sub = { productId: "pro.marketingtool.growth.monthly", platform: "ios", appleReceipt: "legacy-receipt" };
  const future = String(Date.now() + 86_400_000);

  dbWrites = []; routes = {};
  let r = await call(sub, {});
  check("no caller identity -> 401, nothing written", r.status === 401 && dbWrites.length === 0);

  r = await call({ ...sub, userId: "user_b" });
  check("userId of another account -> 403, nothing written", r.status === 403 && dbWrites.length === 0);

  delete process.env.APPLE_SHARED_SECRET;
  r = await call(sub);
  check("iOS legacy receipt without shared secret -> 503, nothing written", r.status === 503 && dbWrites.length === 0);

  process.env.APPLE_SHARED_SECRET = "s";
  routes = { "buy.itunes.apple.com /verifyReceipt": { status: 200, json: { status: 21003 } } };
  r = await call(sub);
  check("iOS receipt rejected by Apple -> 403, nothing written", r.status === 403 && dbWrites.length === 0);

  routes = { "buy.itunes.apple.com /verifyReceipt": { status: 200, json: { status: 0, receipt: { bundle_id: "other.app", in_app: [] } } } };
  r = await call(sub);
  check("iOS receipt for another app -> 403", r.status === 403 && dbWrites.length === 0);

  routes = { "buy.itunes.apple.com /verifyReceipt": { status: 200, json: { status: 0, receipt: { bundle_id: "pro.marketingtool.app", in_app: [] },
    latest_receipt_info: [{ product_id: sub.productId, expires_date_ms: String(Date.now() - 1000) }] } } };
  r = await call(sub);
  check("iOS expired subscription -> 403", r.status === 403 && dbWrites.length === 0);

  routes = { "buy.itunes.apple.com /verifyReceipt": { status: 200, json: { status: 0, receipt: { bundle_id: "pro.marketingtool.app", in_app: [] },
    latest_receipt_info: [{ product_id: sub.productId, expires_date_ms: future }] } } };
  r = await call(sub);
  check("iOS active subscription -> profile upgraded", r.status === 200 && dbWrites.length === 1 && dbWrites[0].updates.subscription === "growth");

  dbWrites = [];
  r = await call({ ...sub, appleReceipt: "aaa.bbb.ccc" });
  check("iOS forged JWS -> rejected, nothing written", r.status === 403 && dbWrites.length === 0);

  const android = { productId: "growth", platform: "android", googlePurchaseToken: "tok" };
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  r = await call(android);
  check("Android without service account -> 503", r.status === 503 && dbWrites.length === 0);

  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = Buffer.from(JSON.stringify({
    client_email: "sa@example.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
  })).toString("base64");
  const tokenRoute = { "oauth2.googleapis.com /token": { status: 200, json: { access_token: "at", expires_in: 3600 } } };

  routes = { ...tokenRoute, "androidpublisher.googleapis.com /androidpublisher/v3/applications/pro.marketingtool.app/purchases/subscriptionsv2/tokens/tok":
    { status: 200, json: { subscriptionState: "SUBSCRIPTION_STATE_EXPIRED", lineItems: [{ productId: "growth" }] } } };
  r = await call(android);
  check("Android expired subscription -> 403", r.status === 403 && dbWrites.length === 0);

  routes = { ...tokenRoute, "androidpublisher.googleapis.com /androidpublisher/v3/applications/pro.marketingtool.app/purchases/subscriptionsv2/tokens/tok":
    { status: 200, json: { subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", lineItems: [{ productId: "starter" }] } } };
  r = await call(android);
  check("Android token for a cheaper product -> 403", r.status === 403 && dbWrites.length === 0);

  routes = { ...tokenRoute, "androidpublisher.googleapis.com /androidpublisher/v3/applications/pro.marketingtool.app/purchases/subscriptionsv2/tokens/tok":
    { status: 200, json: { subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", lineItems: [{ productId: "growth" }] } } };
  r = await call(android);
  check("Android active subscription -> profile upgraded", r.status === 200 && dbWrites.length === 1 && dbWrites[0].updates.subscription === "growth");

  dbWrites = [];
  const tokens = { productId: "tokens", platform: "android", googlePurchaseToken: "tok" };
  routes = { ...tokenRoute, "androidpublisher.googleapis.com /androidpublisher/v3/applications/pro.marketingtool.app/purchases/products/tokens/tokens/tok":
    { status: 200, json: { purchaseState: 0, consumptionState: 1 } } };
  r = await call(tokens);
  check("Android already-consumed token -> 403, no credits", r.status === 403 && dbWrites.length === 0);

  routes = { ...tokenRoute, "androidpublisher.googleapis.com /androidpublisher/v3/applications/pro.marketingtool.app/purchases/products/tokens/tokens/tok":
    { status: 200, json: { purchaseState: 0, consumptionState: 0 } } };
  r = await call(tokens);
  check("Android unconsumed token -> credits added", r.status === 200 && dbWrites.length === 1 && dbWrites[0].updates.credits === 105);

  console.log(failures ? `${failures} FAILED` : "all passed");
  process.exit(failures ? 1 : 0);
})();
