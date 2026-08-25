import wmill
import json as json_module
import requests as requests_lib
from typing import Optional, List
from datetime import datetime, timezone

# ══════════════════════════════════════════════════════════════
# CREATIVE ENGINE — Connected to AI Router (VPS 1:9000)
# ══════════════════════════════════════════════════════════════

AI_ROUTER_URL = "http://localhost:9000/generate"

TOOL_ROUTING = {
    "cold-outreach-email": ("creative", "cold_email"),
    "product-launch-email-sequence": ("creative", "launch_email"),
    "email-writer": ("creative", "email_general"),
    "meta-ai-copywriter": ("creative", "meta_ad_copy"),
    "instagram-caption-generator": ("creative", "ig_caption"),
    "blog-writer": ("creative", "blog"),
    "sales-page-copy-writer": ("creative", "sales_page"),
    "cta-writer": ("creative", "cta_pack"),
    "seo-title-generator": ("creative", "seo_titles"),
    "linkedin-ad-copy-generator": ("creative", "linkedin_ad"),
    "article-generator": ("creative", "article"),
    "product-description-writer": ("creative", "product_desc"),
}

def call_ai_router(task: str, prompt: str, image_url: Optional[str] = None) -> str:
    payload = {"task": task, "prompt": prompt}
    if image_url:
        payload["image_url"] = image_url

    try:
        resp = requests_lib.post(AI_ROUTER_URL, json=payload, timeout=60)
        resp.raise_for_status()
        return resp.json().get("response", "")
    except Exception as e:
        print(f"[AI Router Error] {e}")
        return f"Error generating content via AI Router: {str(e)}"


def _strip_code_fences(text: str) -> str:
    """Remove a ```json ... ``` wrapper if the model returned one.

    The previous version did
        text.replace("\"\"json", "").replace("\"\"", "")
    which strips DOUBLE QUOTES, not BACKTICKS. Fenced replies therefore reached
    json.loads() with the fence still attached and always failed to parse, so
    every creative tool fell into the "Failed to parse AI response as JSON"
    branch even when the model answered correctly.
    """
    t = (text or "").strip()
    if t.startswith("```"):
        # drop the opening fence line (``` or ```json) and any closing fence
        first_nl = t.find("\n")
        if first_nl != -1:
            t = t[first_nl + 1:]
        if t.rstrip().endswith("```"):
            t = t.rstrip()[:-3]
    return t.strip()


def run_engine(payload: dict, mode: str) -> dict:
    # The literal JSON braces must NOT be f-string expression slots, and an
    # escaped quote is not legal inside one. Written as a single f-string,
    # `{\"variants\": ...}` made this module fail to COMPILE, so the whole
    # engine could not run at all.
    # Interpolated parts stay f-strings; the JSON shape is a plain string.
    prompt = (
        f"Act as an expert marketing copywriter. Mode: {mode}. "
        f"Context: {json_module.dumps(payload)}. "
        "Generate 3 high-converting variants. "
        'Return JSON: {"variants": [{"headline": "...", "body": "...", "cta": "..."}]}'
    ).strip()

    response_text = call_ai_router("creative", prompt)

    try:
        clean_json = _strip_code_fences(response_text)
        data = json_module.loads(clean_json)
        return {"success": True, "data": data}
    except Exception as e:
        # Keep the reason: a bare `except:` hid whether this was a parse failure
        # or an AI Router error, which made the same generic message appear for
        # both.
        return {
            "success": False,
            "error": f"Failed to parse AI response as JSON: {e}",
            "raw": response_text,
        }


def generate_variant_images(variants: List[dict]) -> List[dict]:
    updated = []
    for v in variants:
        # Same fix as run_engine: pull the lookup out so the f-string
        # expression contains no escaped quotes.
        headline = v.get("headline", "")
        prompt = f"Professional marketing image for: {headline}. Style: Modern, clean, high-end."
        image_url = call_ai_router("image_gen", prompt)
        v["image_url"] = image_url
        updated.append(v)
    return updated


def save_generation(userId, slug, engine, mode, result, payload):
    # NOTE: this is a stub. It returns a synthetic id and writes nothing, so
    # creative-engine runs do not appear in history even though the caller
    # stores the returned generationId. Left as found — wiring it to the real
    # store is a separate change.
    try:
        return "gen_" + str(datetime.now(timezone.utc).timestamp())
    except Exception:
        return None


_AW_ENDPOINT = "https://api.marketingtool.pro/v1"
_AW_PROJECT = "6952c8a0002d3365625d"


def _validate_jwt(jwt_token, expected_uid=""):
    if not jwt_token:
        return None, "Authentication required"
    try:
        import urllib.request, ssl
        _ctx = ssl.create_default_context()
        _ctx.check_hostname = False
        _ctx.verify_mode = ssl.CERT_NONE
        _req = urllib.request.Request(
            f"{_AW_ENDPOINT}/account",
            headers={"X-Appwrite-Project": _AW_PROJECT, "X-Appwrite-JWT": jwt_token},
        )
        _resp = urllib.request.urlopen(_req, timeout=5, context=_ctx)
        user = json_module.loads(_resp.read().decode())
        # Appwrite returns the account id as "$id". The previous code read
        # user.get("") -- an EMPTY key -- which is always None, so any call that
        # passed a userId was rejected with "User ID mismatch" no matter how
        # valid the token was.
        if expected_uid and user.get("$id") != expected_uid:
            return None, "User ID mismatch"
        return user, None
    except Exception:
        return None, "Invalid or expired token"


def main(toolSlug: Optional[str] = None, input: Optional[str] = None, userId: Optional[str] = None, appwriteJwt: Optional[str] = None):
    user, err = _validate_jwt(appwriteJwt, userId)
    if err:
        return {"success": False, "error": err}

    if not input:
        return {"success": False, "error": "Missing input"}

    slug = toolSlug or "general"
    _, mode = TOOL_ROUTING.get(slug, ("creative", "general"))

    payload = {"input": input, "userId": userId, "slug": slug}
    result = run_engine(payload, mode)

    if result.get("success"):
        result["data"]["variants"] = generate_variant_images(result["data"].get("variants", []))
        result["generationId"] = save_generation(userId, slug, "creative", mode, result, payload)

    return result
