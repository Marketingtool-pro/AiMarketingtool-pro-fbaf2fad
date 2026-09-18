// Run:  node appwrite-functions/iap-verify/test/entitlement-parity.test.cjs
//
// The client (src/services/billingService.ts) and the server (this function)
// each keep their own product -> entitlement map. If they drift, a purchase
// completes on the device, unlocks locally, and then the server grants nothing —
// silently, because verification is best-effort. This asserts they agree.
//
// Two separate contracts are checked:
//   subscriptions -> PRODUCT_TO_ENTITLEMENT on both sides must map to the same tier
//   consumables   -> the client's isConsumableProduct() set must equal the
//                    server's CONSUMABLE_IDS set
//
// Results are collected into a Map, never a plain object. Assigning
// `obj[nameFromRegex]` lets a crafted source file write `__proto__` and pollute
// Object.prototype (CodeQL js/remote-property-injection, alert #457, which this
// file originally triggered). A Map has no prototype chain to poison.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const client = fs.readFileSync(
  path.join(ROOT, "src", "services", "billingService.ts"), "utf8");
const server = fs.readFileSync(
  path.join(__dirname, "..", "src", "main.js"), "utf8");

/** Pull a brace-balanced object literal that follows `name`. */
function grabObject(src, name) {
  const i = src.indexOf(name);
  if (i < 0) throw new Error("not found: " + name);
  const open = src.indexOf("{", i);
  let depth = 0, j = open;
  for (; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") { depth--; if (!depth) break; }
  }
  return src.slice(open, j + 1);
}

/** product id -> tier, as a Map. Consumables (null) are covered separately. */
function tiers(objectSrc) {
  const out = new Map();
  const re = /["']([^"']+)["']\s*:\s*(\{[^}]*\}|null)/g;
  let m;
  while ((m = re.exec(objectSrc))) {
    if (m[2] === "null") continue;
    const tier = /tier:\s*["']([^"']+)["']/.exec(m[2]);
    if (tier) out.set(m[1], tier[1]);
  }
  return out;
}

/** Collect the string literals inside a `new Set([...])`. */
function setLiterals(src, name) {
  const i = src.indexOf(name);
  if (i < 0) throw new Error("not found: " + name);
  const open = src.indexOf("[", i);
  const close = src.indexOf("]", open);
  return new Set(
    (src.slice(open + 1, close).match(/["']([^"']+)["']/g) || [])
      .map((s) => s.slice(1, -1)),
  );
}

let pass = 0, fail = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (detail ? "  " + detail : "")); }
};

const c = tiers(grabObject(client, "PRODUCT_TO_ENTITLEMENT"));
const s = tiers(grabObject(server, "PRODUCT_TO_ENTITLEMENT"));

console.log("subscription products:");
for (const id of [...new Set([...c.keys(), ...s.keys()])].sort()) {
  const cv = c.get(id);
  const sv = s.get(id);
  check(`${id} -> ${cv || "MISSING"}`, cv === sv,
    `client=${cv || "MISSING"} server=${sv || "MISSING"}`);
}

console.log("consumable products:");
const cCons = setLiterals(client, "ALL_CONSUMABLE_IDS");
const sCons = setLiterals(server, "CONSUMABLE_IDS");
for (const id of [...new Set([...cCons, ...sCons])].sort()) {
  check(`${id} known to both`, cCons.has(id) && sCons.has(id),
    `client=${cCons.has(id)} server=${sCons.has(id)}`);
}
// Both store ids must be present: a restored purchase can carry either.
check("App Store consumable id present", cCons.has("pro.marketingtool.tokens"));
check("Play consumable id present", cCons.has("tokens"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
