// Exercise the hardened phone-session handler without Appwrite or a real token.
// Every forged or missing credential must be refused with 401/400 BEFORE any
// Appwrite call is made (node-appwrite is stubbed to throw if reached).
const Module = require("module");
const crypto = require("crypto");
const { EventEmitter } = require("events");
const origLoad = Module._load;
let appwriteReached = false;

// A key pair that plays the role of Google's signing key. The handler fetches
// "Google's certs" through the stubbed https module below and receives this
// public key, so tokens signed with TRUSTED_PRIVATE verify and anything else
// does not. No network access is needed.
const trusted = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const TRUSTED_KID = "trusted-kid";
const TRUSTED_PEM = trusted.publicKey.export({ type: "spki", format: "pem" });

Module._load = function (request, ...rest) {
  if (request === "https") {
    return {
      get(_url, cb) {
        const resp = new EventEmitter();
        resp.statusCode = 200;
        resp.headers = { "cache-control": "max-age=3600" };
        process.nextTick(() => {
          cb(resp);
          resp.emit("data", JSON.stringify({ [TRUSTED_KID]: TRUSTED_PEM }));
          resp.emit("end");
        });
        return { on() { return this; } };
      },
    };
  }
  if (request === "node-appwrite") {
    return {
      Client: class { setEndpoint() { return this; } setProject() { return this; } setKey() { return this; } },
      Users: class {
        async get(id) { appwriteReached = true; return { $id: id }; }
        async create() { appwriteReached = true; }
        async createToken(id) { appwriteReached = true; return { userId: id, secret: "stub-secret" }; }
      },
    };
  }
  return origLoad.call(this, request, ...rest);
};

const handler = require("./src/main.js");

function b64url(obj) { return Buffer.from(JSON.stringify(obj)).toString("base64url"); }

// Each call gets its own client IP unless one is given, so the per-IP throttle
// only affects the cases that deliberately exercise it.
let ipCounter = 0;
async function run(name, body, env = {}, ip = `10.0.0.${++ipCounter}`) {
  appwriteReached = false;
  const saved = {};
  for (const [k, v] of Object.entries(env)) { saved[k] = process.env[k]; process.env[k] = v; }
  let out;
  await handler({
    req: { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) },
    res: { json: (b, status) => (out = { status, body: b }) },
    log: () => {},
    error: () => {},
  });
  for (const k of Object.keys(env)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  return { name, status: out.status, appwriteReached, error: out.body.error, success: out.body.success };
}

(async () => {
  // A forged RS256-looking token signed by OUR key, claiming the right project and a victim phone.
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: "RS256", kid: "forged-kid", typ: "JWT" });
  const payload = b64url({
    iss: "https://securetoken.google.com/marketing-tool-484720",
    aud: "marketing-tool-484720", sub: "victim", iat: now, auth_time: now, exp: now + 3600,
    phone_number: "+919999999998",
  });
  const sig = crypto.createSign("RSA-SHA256").update(`${header}.${payload}`).sign(privateKey).toString("base64url");
  const forged = `${header}.${payload}.${sig}`;

  function signed(claims, kid = TRUSTED_KID, key = trusted.privateKey) {
    const h = b64url({ alg: "RS256", kid, typ: "JWT" });
    const p = b64url(claims);
    const sg = crypto.createSign("RSA-SHA256").update(`${h}.${p}`).sign(key).toString("base64url");
    return `${h}.${p}.${sg}`;
  }
  const base = {
    iss: "https://securetoken.google.com/marketing-tool-484720",
    aud: "marketing-tool-484720", sub: "user-1", iat: now, auth_time: now, exp: now + 3600,
    phone_number: "+15551234567", firebase: { sign_in_provider: "phone" },
  };

  const results = [
    await run("valid fresh phone token (expect 200)", { idToken: signed(base) }),
    await run("stale auth_time, refreshed token (expect 401)",
      { idToken: signed({ ...base, auth_time: now - 3600, iat: now }) }),
    await run("non-phone provider (expect 401)",
      { idToken: signed({ ...base, firebase: { sign_in_provider: "password" } }) }),
    await run("expired token (expect 401)",
      { idToken: signed({ ...base, iat: now - 7200, auth_time: now - 7200, exp: now - 3600 }) }),
    await run("__proto__ kid (expect 401)", { idToken: signed(base, "__proto__") }),
    await run("v1-style body (firebaseUid+phone, no token)", { firebaseUid: "x", phone: "+919999999998" }),
    await run("malformed token", { idToken: "abc.def" }),
    await run("forged token (unknown kid, own key)", { idToken: forged }),
    await run("reviewer attempt, server vars unset", { reviewerPhone: "+919999999999", reviewerCode: "123456" }),
    await run("reviewer wrong code", { reviewerPhone: "+919999999999", reviewerCode: "000000" },
      { REVIEWER_PHONE: "+919999999999", REVIEWER_OTP: "123456" }),
    await run("reviewer other phone", { reviewerPhone: "+919999999998", reviewerCode: "123456" },
      { REVIEWER_PHONE: "+919999999999", REVIEWER_OTP: "123456" }),
    await run("reviewer correct", { reviewerPhone: "+919999999999", reviewerCode: "123456" },
      { REVIEWER_PHONE: "+919999999999", REVIEWER_OTP: "123456" }),
  ];
  // Brute force of the reviewer code must hit the throttle (429) rather than
  // being answered 401 forever.
  const env = { REVIEWER_PHONE: "+919999999999", REVIEWER_OTP: "123456" };
  let last;
  for (let i = 0; i < 12; i++) {
    last = await run("reviewer brute force", { reviewerPhone: "+919999999999", reviewerCode: String(100000 + i) }, env, "203.0.113.7");
  }
  results.push({ ...last, name: "reviewer brute force after 12 tries (expect 429)" });
  results.push(await run("correct code while throttled (expect 429)",
    { reviewerPhone: "+919999999999", reviewerCode: "123456" }, env, "203.0.113.7"));

  for (const r of results) console.log(JSON.stringify(r));
})();
