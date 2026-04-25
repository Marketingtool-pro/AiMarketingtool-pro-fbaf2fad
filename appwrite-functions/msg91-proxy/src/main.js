/**
 * msg91-proxy — OTP send + verify via Bird (MessageBird) Verify API.
 *
 * Function name kept as "msg91-proxy" for backwards compatibility with the
 * phone-app code that calls it. Internally uses Bird, NOT MSG91 (DLT issues
 * in India). Delivery is SMS (UsedPlatform: "sms").
 *
 * Actions (request body JSON):
 *   { action: "sendOtp",   phone: "9571312555", countryCode: "+91" }
 *     -> { success: true, verificationId: "<bird verify id>" }
 *   { action: "verifyOtp", code: "514164", verificationId: "<from sendOtp>" }
 *     -> { success: true } | { success: false, message: "..." }
 *
 * Always returns valid JSON — no plain-text/HTML responses, so the phone
 * app's JSON.parse never throws "Unexpected token o in JSON at position 1".
 *
 * Env vars (already set in Appwrite Function Settings):
 *   BIRD_WORKSPACE_ID  — required
 *   BIRD_CHANNEL_ID    — required (SMS channel)
 *   BIRD_ACCESS_KEY    — required
 */

const BIRD_BASE = 'https://api.bird.com';

const respond = (res, payload, statusCode = 200) =>
  res.json(payload, statusCode, { 'Content-Type': 'application/json' });

const normalizeMobile = (countryCode, phone) => {
  const cc = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  return `${cc}${phone}`.replace(/[\s\-()]/g, '');
};

async function birdSendOtp({ phone, countryCode }, log, error) {
  const fullPhone = normalizeMobile(countryCode, phone);
  const url = `${BIRD_BASE}/workspaces/${process.env.BIRD_WORKSPACE_ID}/channels/${process.env.BIRD_CHANNEL_ID}/verifications`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `AccessKey ${process.env.BIRD_ACCESS_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier: { type: 'phonenumber', value: fullPhone },
      timeout: 600,
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    error(`Bird send failed ${r.status}: ${JSON.stringify(data).slice(0, 300)}`);
    return { ok: false, message: data.message || data.error || 'Failed to send OTP' };
  }
  log(`Bird verification id=${data.id} for ${fullPhone}`);
  return { ok: true, verificationId: data.id };
}

async function birdVerifyOtp({ verificationId, code }, log, error) {
  const url = `${BIRD_BASE}/workspaces/${process.env.BIRD_WORKSPACE_ID}/verifications/${verificationId}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `AccessKey ${process.env.BIRD_ACCESS_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    error(`Bird verify failed ${r.status}: ${JSON.stringify(data).slice(0, 300)}`);
    return { ok: false, message: data.message || 'Invalid OTP. Please try again.' };
  }
  if (data.status === 'verified') {
    log(`Bird verified ${verificationId}`);
    return { ok: true };
  }
  if (data.status === 'expired') return { ok: false, message: 'OTP expired. Please request a new code.' };
  return { ok: false, message: 'Invalid OTP. Please try again.' };
}

export default async ({ req, res, log, error }) => {
  let body;
  try {
    body = JSON.parse(req.bodyRaw || req.body || '{}');
  } catch (e) {
    return respond(res, { success: false, message: 'Invalid request body' }, 400);
  }

  const { action } = body;

  if (action === 'sendOtp') {
    if (!body.phone || !body.countryCode) {
      return respond(res, { success: false, message: 'Missing phone or countryCode' }, 400);
    }
    const r = await birdSendOtp(body, log, error);
    return respond(
      res,
      r.ok ? { success: true, verificationId: r.verificationId } : { success: false, message: r.message },
      r.ok ? 200 : 502,
    );
  }

  if (action === 'verifyOtp') {
    if (!body.code || !body.verificationId) {
      return respond(res, { success: false, message: 'Missing code or verificationId' }, 400);
    }
    const r = await birdVerifyOtp(body, log, error);
    return respond(res, r.ok ? { success: true } : { success: false, message: r.message });
  }

  return respond(res, { success: false, message: `Unknown action: ${action}` }, 400);
};
