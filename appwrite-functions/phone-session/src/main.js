/**
 * Appwrite Function: phone-session  (v2.0.0)
 *
 * Creates or reuses the Appwrite user for a Firebase phone-auth user and returns
 * a one-time { userId, secret } the app exchanges for a session.
 *
 * v2 requires a Firebase ID token and takes the phone number from the VERIFIED
 * token, never from the request body.
 *
 * Verification uses only Node's built-in crypto and Google's public signing
 * certificates for Firebase ID tokens -- no service account, no new secrets.
 * Checks, per Firebase's "verify ID tokens using a third-party JWT library":
 *   alg RS256, kid present in Google's current certs, signature valid,
 *   aud == project id, iss == https://securetoken.google.com/<project id>,
 *   exp in the future, iat and auth_time in the past, sub non-empty.
 */
const https = require("https");
const crypto = require("crypto");
const { Client, Users } = require("node-appwrite");

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "marketing-tool-484720";
const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const CLOCK_SKEW_SECONDS = 300;

let certCache = { certs: null, expiresAt: 0 };

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (resp) => {
        let data = "";
        resp.on("data", (c) => (data += c));
        resp.on("end", () => {
          if (resp.statusCode !== 200) return reject(new Error(`certs HTTP ${resp.statusCode}`));
          const maxAge = /max-age=(\d+)/.exec(resp.headers["cache-control"] || "");
          try {
            resolve({ json: JSON.parse(data), maxAge: maxAge ? Number(maxAge[1]) : 3600 });
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function googleCerts() {
  const now = Date.now();
  if (certCache.certs && now < certCache.expiresAt) return certCache.certs;
  const { json, maxAge } = await getJson(CERTS_URL);
  certCache = { certs: json, expiresAt: now + maxAge * 1000 };
  return json;
}

function b64urlJson(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

async function verifyFirebaseIdToken(idToken) {
  if (typeof idToken !== "string") throw new Error("missing idToken");
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("malformed idToken");

  const header = b64urlJson(parts[0]);
  const payload = b64urlJson(parts[1]);
  if (header.alg !== "RS256") throw new Error("unexpected alg");

  const certs = await googleCerts();
  const pem = certs[header.kid];
  if (!pem) throw new Error("unknown kid");

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  if (!verifier.verify(crypto.createPublicKey(pem), Buffer.from(parts[2], "base64url"))) {
    throw new Error("bad signature");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error("wrong audience");
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) throw new Error("wrong issuer");
  if (!payload.sub || typeof payload.sub !== "string") throw new Error("missing subject");
  if (typeof payload.exp !== "number" || payload.exp <= nowSec - CLOCK_SKEW_SECONDS) throw new Error("token expired");
  if (typeof payload.iat !== "number" || payload.iat > nowSec + CLOCK_SKEW_SECONDS) throw new Error("issued in the future");
  if (typeof payload.auth_time !== "number" || payload.auth_time > nowSec + CLOCK_SKEW_SECONDS) {
    throw new Error("auth_time in the future");
  }
  return payload;
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function parseBody(raw) {
  if (raw && typeof raw === "object" && !Buffer.isBuffer(raw)) return raw;
  if (Buffer.isBuffer(raw)) return JSON.parse(raw.toString("utf8"));
  if (typeof raw === "string" && raw.trim()) return JSON.parse(raw);
  return {};
}

module.exports = async ({ req, res, log, error }) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (req.method === "OPTIONS") return res.json({ status: "ok" }, 200, headers);

  let body;
  try {
    body = parseBody(req.body);
  } catch (e) {
    return res.json({ error: "Invalid request body" }, 400, headers);
  }

  const { idToken, displayName, reviewerPhone, reviewerCode } = body || {};

  let phoneDigits;

  // App Store / Play review account. Only when BOTH server-side variables are
  // set, compared in constant time, and only ever for that single number.
  const serverReviewerPhone = digits(process.env.REVIEWER_PHONE);
  const serverReviewerCode = String(process.env.REVIEWER_OTP || "");
  const isReviewerAttempt =
    !idToken && serverReviewerPhone && serverReviewerCode && reviewerPhone && reviewerCode;

  if (isReviewerAttempt) {
    const phoneOk = digits(reviewerPhone) === serverReviewerPhone;
    const a = Buffer.from(String(reviewerCode));
    const b = Buffer.from(serverReviewerCode);
    const codeOk = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!phoneOk || !codeOk) {
      return res.json({ error: "Invalid reviewer credentials" }, 401, headers);
    }
    phoneDigits = serverReviewerPhone;
  } else {
    let claims;
    try {
      claims = await verifyFirebaseIdToken(idToken);
    } catch (e) {
      error("phone-session: rejected token: " + e.message);
      return res.json({ error: "Phone verification could not be confirmed" }, 401, headers);
    }
    phoneDigits = digits(claims.phone_number);
    if (!phoneDigits) {
      return res.json({ error: "Token has no verified phone number" }, 401, headers);
    }
  }

  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://api.marketingtool.pro/v1")
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const users = new Users(client);

    const userId = "phone_" + phoneDigits;
    const email = phoneDigits + "@phone.marketingtool.pro";

    try {
      await users.get(userId);
    } catch (e) {
      try {
        await users.create(userId, email, undefined, undefined, displayName || "User");
        log("phone-session: created " + userId);
      } catch (createErr) {
        error("phone-session: create failed: " + createErr.message);
        return res.json({ error: "Failed to create user" }, 500, headers);
      }
    }

    const token = await users.createToken(userId);
    return res.json({ success: true, userId: token.userId, secret: token.secret }, 200, headers);
  } catch (err) {
    error("phone-session error: " + err.message);
    return res.json({ error: "Session could not be created" }, 500, headers);
  }
};
