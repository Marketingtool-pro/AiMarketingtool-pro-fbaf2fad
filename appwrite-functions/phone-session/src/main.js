/**
 * Appwrite Function: phone-session  (v1.1.0)
 * Creates Appwrite user + session for Firebase phone auth users.
 * Phone App calls this AFTER Firebase OTP verify succeeds.
 * Returns { userId, secret } for account.createSession() on client.
 */
const { Client, Users, ID } = require("node-appwrite");

module.exports = async ({ req, res, log, error }) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (req.method === "OPTIONS") return res.json({ status: "ok" }, 200, headers);

  // Defensive body parsing: v1.0 crashed with "Unexpected token o in JSON at
  // position 1" when an upstream caller String(obj)'d an object, sending the
  // literal "[object Object]" string. 29% of OTPs (9 of 32) failed since
  // 2026-04-24 before this fix.
  let body;
  const raw = req.body;
  if (raw && typeof raw === "object" && !Buffer.isBuffer(raw)) {
    body = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      body = JSON.parse(raw);
    } catch (e) {
      error("invalid JSON body — len=" + raw.length + " prefix=" + raw.substring(0, 40));
      return res.json({ error: "Invalid request body (not JSON)" }, 400, headers);
    }
  } else if (Buffer.isBuffer(raw)) {
    try { body = JSON.parse(raw.toString("utf8")); }
    catch (e) {
      error("invalid Buffer body");
      return res.json({ error: "Invalid request body" }, 400, headers);
    }
  } else {
    body = {};
  }

  const { firebaseUid, phone, displayName } = body;
  if (!firebaseUid || !phone) {
    return res.json({ error: "Missing firebaseUid or phone" }, 400, headers);
  }

  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://api.marketingtool.pro/v1")
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const users = new Users(client);

    const cleanPhone = String(phone).replace(/\D/g, "");
    const userId = "phone_" + cleanPhone;
    const email  = cleanPhone + "@phone.marketingtool.pro";
    log("phone-session: " + phone + " uid=" + firebaseUid);

    try { await users.get(userId); }
    catch (e) {
      try {
        await users.create(userId, email, undefined, undefined, displayName || "User");
        log("created: " + userId);
      } catch (createErr) {
        error("create failed: " + createErr.message);
        return res.json({ error: "Failed to create user" }, 500, headers);
      }
    }

    const token = await users.createToken(userId);
    return res.json({ success: true, userId: token.userId, secret: token.secret }, 200, headers);

  } catch (err) {
    error("phone-session error: " + err.message);
    return res.json({ error: err.message }, 500, headers);
  }
};
