#!/usr/bin/env node
/**
 * compressIcons.js — keep bundled images no larger than they are ever drawn.
 *
 * `package.json` has declared `"icons:compress": "node scripts/compressIcons.js"`
 * for a long time, but the file did not exist, so it never ran. The icons drifted
 * far above their display size: on 2026-09-18 the shipped bundle still carried 132
 * tool icons above 224px (12 of them at 1024x1024), seven 1024x1024 category tabs
 * drawn at 18dp, and two 3000x3000 onboarding icons. A 1024^2 PNG decodes to ~4 MB
 * of RAM; a 3000^2 one to ~36 MB. That is what Play's "bitmap image optimization"
 * recommendation is about, and it is memory the app was spending for nothing.
 *
 * Budgets below are "largest size any screen draws it at" x4 (xxxhdpi is the
 * densest bucket Android ships), so nothing visibly softens:
 *
 *   tool icons        ToolsScreen grid, 56dp tiles              -> 224px
 *   platform tabs     ToolsScreen category tabs, 18dp           ->  72px
 *   platform logos    LoginScreen 56dp (Dashboard/Chat smaller) -> 224px
 *   onboarding art    scales with screen width (~29%)           -> 768px
 *
 * Resizes with `sips` (ships with macOS), then compresses with `pngquant` when it
 * is installed. `pngquant --skip-if-larger` never writes a file it cannot shrink,
 * so a re-run is safe and idempotent: images already within budget are skipped.
 *
 * Usage:
 *   npm run icons:compress            # report what would change, write nothing
 *   npm run icons:compress -- --apply # actually rewrite the files
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");

/** Longest edge each group may keep, in pixels. */
const BUDGETS = [
  { dir: "src/assets/images/tool-icons-v2", max: 224, label: "tool icons (56dp grid)" },
  { dir: "assets/images/platforms", max: 224, label: "platform logos (56dp)" },
  { dir: "assets/images/tool-icons-v2", max: 768, label: "onboarding art (scales with width)" },
];

/** Drawn at 18dp in the ToolsScreen tab row — much smaller than the rest. */
const TAB_ICON_PREFIX = "plat-";
const TAB_ICON_MAX = 72;

function pngSize(file) {
  const fd = fs.openSync(file, "r");
  const head = Buffer.alloc(24);
  fs.readSync(fd, head, 0, 24, 0);
  fs.closeSync(fd);
  if (head.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

function has(cmd) {
  try {
    execFileSync("/usr/bin/which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Only images the app actually bundles.
 *
 * `src/assets/images/tool-icons-v2/` holds 1451 files but only the ~314 that a
 * `require()` names are packaged by Metro. Resizing the rest would rewrite files
 * that never ship — so collect every `require('...png')` under src/ plus the
 * icon/splash paths named in app.json, and consider nothing else.
 */
function referencedImages() {
  const found = new Set();
  const addFromText = (text, fromDir) => {
    const re = /require\(\s*['"]([^'"]+\.png)['"]\s*\)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      found.add(path.resolve(fromDir, m[1]));
    }
  };

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        walk(full);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        addFromText(fs.readFileSync(full, "utf8"), path.dirname(full));
      }
    }
  };
  walk(path.join(ROOT, "src"));

  // app.json names icons/splash by path rather than require()
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, "app.json"), "utf8"));
  const collectPaths = (node) => {
    if (typeof node === "string" && node.endsWith(".png") && node.startsWith("./")) {
      found.add(path.resolve(ROOT, node));
    } else if (Array.isArray(node)) {
      node.forEach(collectPaths);
    } else if (node && typeof node === "object") {
      Object.values(node).forEach(collectPaths);
    }
  };
  collectPaths(appJson);

  return found;
}

const REFERENCED = referencedImages();

const HAS_PNGQUANT = has("pngquant");
if (!HAS_PNGQUANT) {
  console.warn("pngquant not found — images will be resized but not re-compressed.");
  console.warn("Install it with: brew install pngquant\n");
}

let scanned = 0;
let overBudget = 0;
let bytesBefore = 0;
let bytesAfter = 0;

for (const group of BUDGETS) {
  const dir = path.join(ROOT, group.dir);
  if (!fs.existsSync(dir)) continue;

  for (const name of fs.readdirSync(dir)) {
    if (!name.toLowerCase().endsWith(".png")) continue;

    const file = path.join(dir, name);
    if (!REFERENCED.has(file)) continue; // not bundled — leave it alone

    const size = pngSize(file);
    if (!size) continue;

    scanned += 1;
    const max = name.startsWith(TAB_ICON_PREFIX) ? TAB_ICON_MAX : group.max;
    const longest = Math.max(size.width, size.height);
    if (longest <= max) continue;

    overBudget += 1;
    const before = fs.statSync(file).size;
    bytesBefore += before;

    const rel = path.relative(ROOT, file);
    if (!APPLY) {
      console.log(`  ${size.width}x${size.height} -> ${max}px   ${rel}`);
      bytesAfter += before;
      continue;
    }

    execFileSync("sips", ["-Z", String(max), file], { stdio: "ignore" });
    if (HAS_PNGQUANT) {
      try {
        execFileSync(
          "pngquant",
          ["--quality=80-100", "--speed=1", "--strip", "--skip-if-larger",
           "--force", "--ext", ".png", file],
          { stdio: "ignore" },
        );
      } catch {
        // exit 98 = would be larger, 99 = below quality floor. File is left as
        // resized, which is still the win we care about.
      }
    }

    const after = fs.statSync(file).size;
    bytesAfter += after;
    const now = pngSize(file);
    console.log(
      `  ${size.width}x${size.height} -> ${now.width}x${now.height}   ` +
      `${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB   ${rel}`,
    );
  }
}

const mb = (n) => (n / 1e6).toFixed(2);
console.log(`\nscanned ${scanned} PNGs, ${overBudget} over budget`);

if (overBudget === 0) {
  console.log("everything is already within budget.");
} else if (APPLY) {
  console.log(`total ${mb(bytesBefore)} MB -> ${mb(bytesAfter)} MB`);
} else {
  console.log("nothing written. Re-run with --apply to rewrite these files:");
  console.log("  npm run icons:compress -- --apply");
}
