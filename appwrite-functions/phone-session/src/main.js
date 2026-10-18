/**
 * Appwrite Function: phone-session  (v2.1.0)
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
 *
 * v2.1 additionally:
 *   - requires the token to come from a PHONE sign-in (firebase.sign_in_provider
 *     == "phone"), so a phone_number claim inherited from another provider is
 *     not accepted as proof of a fresh OTP;
 *   - requires auth_time to be recent (MAX_AUTH_AGE_SECONDS): the app calls this
 *     immediately after the OTP is confirmed, so an old or stolen-and-refreshed
 *     ID token can no longer mint a new Appwrite session;
 *   - no longer tolerates already-expired tokens (only a small clock skew);
 *   - throttles failed attempts per client IP and globally for the reviewer
 *     path, so the static reviewer code cannot be brute-forced.
 */
const https = require("https");
const crypto = require("crypto");
const { Client, Users } = require("node-appwrite");

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "marketing-tool-484720";
const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const CLOCK_SKEW_SECONDS = 60;
// The OTP must have been confirmed within this window before the session is minted.
const MAX_AUTH_AGE_SECONDS = 10 * 60;

// Best-effort, per-instance throttling. Appwrite may run several instances, so
// this bounds -- rather than strictly enforces -- the attempt rate; it still
// turns a brute force of a static code from minutes into years.
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_IP = 10;
const MAX_REVIEWER_FAILURES_GLOBAL = 25;
const failuresByIp = new Map();
let reviewerFailures = { count: 0, windowStart: 0 };

function clientIp(req) {
  const h = (req && req.headers) || {};
  const fwd = String(h["x-forwarded-for"] || h["X-Forwarded-For"] || "").split(",")[0].trim();
  return fwd || String(h["x-real-ip"] || "unknown");
}

function isThrottled(ip) {
  const now = Date.now();
  const entry = failuresByIp.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) return false;
  return entry.count >= MAX_FAILURES_PER_IP;
}

function recordFailure(ip) {
  const now = Date.now();
  const entry = failuresByIp.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    failuresByIp.set(ip, { count: 1, windowStart: now });
  } else {
    failuresByIp.set(ip, { count: entry.count + 1, windowStart: entry.windowStart });
  }
  // Keep the map bounded.
  if (failuresByIp.size > 5000) failuresByIp.delete(failuresByIp.keys().next().value);
}

function reviewerLocked() {
  const now = Date.now();
  if (now - reviewerFailures.windowStart > RATE_WINDOW_MS) return false;
  return reviewerFailures.count >= MAX_REVIEWER_FAILURES_GLOBAL;
}

function recordReviewerFailure() {
  const now = Date.now();
  reviewerFailures =
    now - reviewerFailures.windowStart > RATE_WINDOW_MS
      ? { count: 1, windowStart: now }
      : { count: reviewerFailures.count + 1, windowStart: reviewerFailures.windowStart };
}

function safeEqual(a, b) {
  // Hash first so the comparison is constant-time even when lengths differ.
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function cleanDisplayName(value) {
  if (typeof value !== "string") return "User";
  const trimmed = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 128);
  return trimmed || "User";
}

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
  if (typeof header.kid !== "string" || !header.kid) throw new Error("missing kid");

  const certs = await googleCerts();
  const pem = Object.prototype.hasOwnProperty.call(certs, header.kid) ? certs[header.kid] : null;
  if (typeof pem !== "string") throw new Error("unknown kid");

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
  if (typeof payload.exp !== "number" || payload.exp + CLOCK_SKEW_SECONDS <= nowSec) throw new Error("token expired");
  if (typeof payload.iat !== "number" || payload.iat > nowSec + CLOCK_SKEW_SECONDS) throw new Error("issued in the future");
  if (typeof payload.auth_time !== "number" || payload.auth_time > nowSec + CLOCK_SKEW_SECONDS) {
    throw new Error("auth_time in the future");
  }
  if (nowSec - payload.auth_time > MAX_AUTH_AGE_SECONDS) throw new Error("phone verification too old");
  const provider = payload.firebase && payload.firebase.sign_in_provider;
  if (provider !== "phone") throw new Error("not a phone sign-in");
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
  if (req.method && req.method !== "POST") return res.json({ error: "Method not allowed" }, 405, headers);

  const ip = clientIp(req);
  if (isThrottled(ip)) {
    return res.json({ error: "Too many attempts. Try again later." }, 429, headers);
  }

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
    if (reviewerLocked()) {
      return res.json({ error: "Too many attempts. Try again later." }, 429, headers);
    }
    const phoneOk = digits(reviewerPhone) === serverReviewerPhone;
    const codeOk = safeEqual(reviewerCode, serverReviewerCode);
    if (!phoneOk || !codeOk) {
      recordFailure(ip);
      recordReviewerFailure();
      return res.json({ error: "Invalid reviewer credentials" }, 401, headers);
    }
    phoneDigits = serverReviewerPhone;
  } else {
    let claims;
    try {
      claims = await verifyFirebaseIdToken(idToken);
    } catch (e) {
      recordFailure(ip);
      error("phone-session: rejected token: " + e.message);
      return res.json({ error: "Phone verification could not be confirmed" }, 401, headers);
    }
    phoneDigits = digits(claims.phone_number);
    if (!phoneDigits) {
      recordFailure(ip);
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
        await users.create(userId, email, undefined, undefined, cleanDisplayName(displayName));
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
