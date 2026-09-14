// Exercise the hardened phone-session handler without Appwrite or a real token.
// Every forged or missing credential must be refused with 401/400 BEFORE any
// Appwrite call is made (node-appwrite is stubbed to throw if reached).
const Module = require("module");
const crypto = require("crypto");
const origLoad = Module._load;
let appwriteReached = false;
Module._load = function (request, ...rest) {
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

async function run(name, body, env = {}) {
  appwriteReached = false;
  const saved = {};
  for (const [k, v] of Object.entries(env)) { saved[k] = process.env[k]; process.env[k] = v; }
  let out;
  await handler({
    req: { method: "POST", body: JSON.stringify(body) },
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

  const results = [
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
  for (const r of results) console.log(JSON.stringify(r));
})();
