/**
 * msg91-proxy — OTP send + verify using Appwrite DB `otps` collection + Bird SMS.
 *
 * Architecture (matches your actual setup, per the otps table screenshot):
 *
 *   sendOtp:
 *     1. Generate random 6-digit code locally
 *     2. Upsert into Appwrite DB > Main Database > otps  with mobile + otp + expiresAt
 *     3. Send the code via Bird channel as plain SMS (NOT Bird Verify API)
 *     4. Return verificationId = mobile (so verify can look it up)
 *
 *   verifyOtp:
 *     1. Query otps collection where mobile == verificationId
 *     2. Compare stored otp to submitted code, check expiresAt > now
 *     3. Delete the row on success (single-use OTP)
 *     4. Return success/fail
 *
 * Env vars (already set in Appwrite Console > Function > Settings):
 *   APPWRITE_API_KEY              — function-side admin key
 *   APPWRITE_PROJECT_ID           — 6952c8a0002d3365625d
 *   APPWRITE_ENDPOINT             — https://api.marketingtool.pro/v1
 *   BIRD_WORKSPACE_ID             — 6268074f-7db9-4c73-b88b-70808aa34099
 *   BIRD_CHANNEL_ID               — 982f6e4f-0574-5c83-8296-0d8ffd5adfa5  (SMS channel)
 *   BIRD_ACCESS_KEY               — Bird API access key
 *
 * Optional env (override defaults):
 *   APPWRITE_DATABASE_ID          — default 'main'
 *   APPWRITE_OTP_COLLECTION_ID    — default 'otps'
 *   OTP_EXPIRY_MINUTES            — default 10
 */

import { Client, Databases, Query, ID } from 'node-appwrite';

const respond = (res, payload, statusCode = 200) =>
  res.json(payload, statusCode, { 'Content-Type': 'application/json' });

const normalizeMobile = (countryCode, phone) => {
  const cc = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  return `${cc}${phone}`.replace(/[\s\-()]/g, '');
};

const randomOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// App Store / Play Store reviewer test number: skip Bird, fixed OTP.
// Update review notes to point reviewers at this phone + code.
const REVIEW_TEST_NUMBERS = new Set(['+919999999999']);
const REVIEW_TEST_OTP = '123456';

function appwriteClient() {
  return new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
}

const DB_ID = process.env.APPWRITE_DATABASE_ID || 'main';
const COLLECTION_ID = process.env.APPWRITE_OTP_COLLECTION_ID || 'otps';
const EXPIRY_MIN = Number(process.env.OTP_EXPIRY_MINUTES) || 10;

async function birdSendSms(fullPhone, text, log, error) {
  const url = `https://api.bird.com/workspaces/${process.env.BIRD_WORKSPACE_ID}/channels/${process.env.BIRD_CHANNEL_ID}/messages`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `AccessKey ${process.env.BIRD_ACCESS_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receiver: { contacts: [{ identifierValue: fullPhone }] },
      body: { type: 'text', text: { text } },
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    error(`Bird SMS send failed ${r.status}: ${JSON.stringify(data).slice(0, 300)}`);
    return { ok: false, message: data.message || 'Failed to send SMS' };
  }
  log(`Bird SMS sent to ${fullPhone} (id=${data.id})`);
  return { ok: true, providerId: data.id };
}

async function upsertOtp(databases, mobile, otp, expiresAt, log) {
  // Delete any existing OTPs for this mobile so the latest one wins
  try {
    const existing = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal('mobile', mobile),
      Query.limit(20),
    ]);
    for (const doc of existing.documents) {
      await databases.deleteDocument(DB_ID, COLLECTION_ID, doc.$id).catch(() => {});
    }
  } catch (e) {
    log(`No prior OTPs to clear (${e.message})`);
  }
  return databases.createDocument(DB_ID, COLLECTION_ID, ID.unique(), {
    mobile,
    otp,
    expiresAt,
  });
}

async function findValidOtp(databases, mobile, code) {
  const now = new Date().toISOString();
  const result = await databases.listDocuments(DB_ID, COLLECTION_ID, [
    Query.equal('mobile', mobile),
    Query.equal('otp', code),
    Query.greaterThan('expiresAt', now),
    Query.limit(1),
  ]);
  return result.documents[0] || null;
}

export default async ({ req, res, log, error }) => {
  let body;
  try {
    body = JSON.parse(req.bodyRaw || req.body || '{}');
  } catch (e) {
    return respond(res, { success: false, message: 'Invalid request body' }, 400);
  }

  const { action } = body;
  const databases = new Databases(appwriteClient());

  if (action === 'sendOtp') {
    if (!body.phone || !body.countryCode) {
      return respond(res, { success: false, message: 'Missing phone or countryCode' }, 400);
    }
    const mobile = normalizeMobile(body.countryCode, body.phone);
    const isReviewTester = REVIEW_TEST_NUMBERS.has(mobile);
    const otp = isReviewTester ? REVIEW_TEST_OTP : randomOtp();
    const expiresAt = new Date(Date.now() + EXPIRY_MIN * 60 * 1000).toISOString();

    try {
      await upsertOtp(databases, mobile, otp, expiresAt, log);
    } catch (e) {
      error(`OTP store failed: ${e.message}`);
      return respond(res, { success: false, message: 'Failed to store OTP' }, 500);
    }

    if (isReviewTester) {
      log(`Review-tester number ${mobile} — skipping Bird SMS, fixed OTP stored`);
      return respond(res, { success: true, verificationId: mobile });
    }

    const sms = await birdSendSms(
      mobile,
      `Your MarketingTool verification code is: ${otp}\n\nValid for ${EXPIRY_MIN} minutes. Do not share.`,
      log,
      error,
    );
    if (!sms.ok) {
      return respond(res, { success: false, message: sms.message }, 502);
    }

    return respond(res, { success: true, verificationId: mobile });
  }

  if (action === 'verifyOtp') {
    if (!body.code || !body.verificationId) {
      return respond(res, { success: false, message: 'Missing code or verificationId' }, 400);
    }
    const mobile = body.verificationId;

    let doc;
    try {
      doc = await findValidOtp(databases, mobile, body.code);
    } catch (e) {
      error(`OTP lookup failed: ${e.message}`);
      return respond(res, { success: false, message: 'Verification service unavailable' }, 500);
    }

    if (!doc) {
      return respond(res, { success: false, message: 'Invalid or expired OTP. Please try again.' });
    }

    // Single-use: delete on success
    await databases.deleteDocument(DB_ID, COLLECTION_ID, doc.$id).catch(() => {});
    log(`OTP verified for ${mobile}`);
    return respond(res, { success: true });
  }

  return respond(res, { success: false, message: `Unknown action: ${action}` }, 400);
};
