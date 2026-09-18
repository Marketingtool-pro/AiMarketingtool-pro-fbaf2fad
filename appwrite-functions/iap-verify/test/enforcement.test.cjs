// Run:  node appwrite-functions/iap-verify/test/enforcement.test.cjs
//
// Guards the fix for CodeQL js/user-controlled-bypass (HIGH). The old code
// gated both validation branches on the client-supplied `platform` string and
// on the presence of a receipt/token, so POSTing
// { userId, productId, platform: "android" } with no token skipped every check
// and still wrote the entitlement — a free subscription for anyone who can
// reach the function, which is `execute: any`.
//
// Exercises the iap-verify enforcement decision table end-to-end through the
// real exported handler. No network: the only paths tested are the ones that
// return before any store call, plus the unconfigured fall-through.
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const SRC = path.resolve(__dirname, "..", "src", "main.js");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "iapbypass-"));
const tmp = path.join(tmpDir, "main.cjs");
fs.writeFileSync(tmp, fs.readFileSync(SRC, "utf8"));

// Stub node-appwrite. listDocuments returns no profile, so the handler stops at
// the "profile not found" success branch instead of touching a real database.
const nm = path.join(tmpDir, "node_modules", "node-appwrite");
fs.mkdirSync(nm, { recursive: true });
fs.writeFileSync(path.join(nm, "package.json"),
  JSON.stringify({ name: "node-appwrite", version: "0.0.0", main: "index.js" }));
fs.writeFileSync(path.join(nm, "index.js"), `
class Client{setEndpoint(){return this}setProject(){return this}setKey(){return this}}
class Databases{constructor(){} async listDocuments(){return {documents:[]}} async updateDocument(){return {}}}
function Query(){} Query.equal=()=>"q";
module.exports={Client,Databases,Query};
`);

const handler = require(tmp);

const { privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const SA = JSON.stringify({
  client_email: "t@example.iam.gserviceaccount.com",
  private_key: privateKey,
});

async function call(body) {
  let out = null;
  const res = { json: (payload, status = 200) => { out = { payload, status }; return out; } };
  await handler({
    req: { body, bodyRaw: JSON.stringify(body), headers: {} },
    res,
    log: () => {},
    error: () => {},
  });
  return out;
}

function clearEnv() {
  delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  delete process.env.APPLE_SHARED_SECRET;
}

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name); }
};

(async () => {
  // THE BYPASS CodeQL FLAGGED: claim android, send no token, get a free tier.
  clearEnv();
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = SA;
  let r = await call({ userId: "u1", productId: "professional", platform: "android" });
  check("no evidence + Play configured -> 403 refused",
    r.status === 403 && r.payload.success === false);

  // Same trick via the other platform string.
  r = await call({ userId: "u1", productId: "professional", platform: "ios" });
  check("lying about platform does not dodge the check",
    r.status === 403 && r.payload.success === false);

  // Apple-only configuration, no receipt supplied.
  clearEnv();
  process.env.APPLE_SHARED_SECRET = "shhh";
  r = await call({ userId: "u1", productId: "pro.marketingtool.pro.monthly", platform: "ios" });
  check("no evidence + Apple configured -> 403 refused",
    r.status === 403 && r.payload.success === false);

  // Nothing configured: must still work, so enabling this cannot lock the owner
  // out before credentials are set.
  clearEnv();
  r = await call({ userId: "u1", productId: "professional", platform: "android" });
  check("nothing configured -> falls through (legacy best-effort)",
    r.status === 200 && r.payload.success === true);

  // Input validation still holds.
  r = await call({ userId: "u1", platform: "android" });
  check("missing productId -> 400", r.status === 400);

  r = await call({ userId: "u1", productId: "not-a-real-product", platform: "android" });
  check("unknown productId -> 400", r.status === 400);

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
