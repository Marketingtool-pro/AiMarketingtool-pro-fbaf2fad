// Run: node --test scripts/deeplinks.test.mjs
//
// Guards the Android App Links setup that the Play Console "Deep links" page
// reports on. Two things can silently break it:
//
//   1. app.json declares a path the navigator cannot route, so tapping the link
//      opens the app on its default screen instead of the page (Play still
//      calls that "Deep linked" -- the report will not catch it).
//   2. the navigator routes a path app.json never declares, so Android never
//      hands the URL to the app at all.
//
// Both show up here as a failure. The URLs below are the real Googlebot-crawled
// rows from the Play deep-links report.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire, stripTypeScriptTypes } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);

// The real config the app ships, not a copy of it. linking.ts cannot be
// imported directly: this package has no "type": "module", so node loads a
// .ts file as CommonJS and chokes on its `export`. Its only imports are
// type-only, so stripping the types leaves a standalone ES module.
const linkingSource = stripTypeScriptTypes(
  readFileSync(join(root, 'src/navigation/linking.ts'), 'utf8'),
  { mode: 'strip' }
);
const { linking } = await import(
  `data:text/javascript;base64,${Buffer.from(linkingSource).toString('base64')}`
);

// React Navigation's own resolver, so this tests the shipped matching rules.
// Imported by file path: the package's "exports" map hides this subpath, and
// the package entry point would drag in react/react-native, which node cannot
// load here. Only the pure path matcher is needed.
const coreRoot = dirname(
  require.resolve('@react-navigation/core/package.json', { paths: [root] })
);
const { getStateFromPath } = await import(
  pathToFileURL(join(coreRoot, 'lib/module/getStateFromPath.js')).href
);

const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;

/** Deepest screen name a URL lands on, or null when nothing matches. */
const screenFor = (url) => {
  const prefix = linking.prefixes.find((p) => url.startsWith(p));
  if (!prefix) return null;
  const state = getStateFromPath(url.slice(prefix.length) || '/', linking.config);
  if (!state) return null;
  let route = state.routes.at(-1);
  const names = [];
  while (route) {
    names.push(route.name);
    const next = route.state?.routes?.at(-1);
    if (!next) break;
    route = next;
  }
  return names.join(' > ');
};

/** Every pathPrefix Android is told to hand to the app. */
const declaredPrefixes = () => {
  const out = new Set();
  for (const filter of app.android.intentFilters) {
    if (!filter.autoVerify) continue;
    for (const datum of filter.data) {
      if (datum.pathPrefix) out.add(datum.pathPrefix);
    }
  }
  return [...out];
};

test('every path app.json claims resolves to a screen', () => {
  for (const prefix of declaredPrefixes()) {
    const url = `https://marketingtool.pro${prefix}/`;
    assert.ok(
      screenFor(url),
      `app.json declares pathPrefix "${prefix}" but the navigator routes nothing for ${url}, ` +
        `so the app would open on its default screen. Add it to src/navigation/linking.ts.`
    );
  }
});

/**
 * Every path the navigator routes, as the static prefix Android matches on.
 * Walks nested navigators too -- Tools sits under Main, and missing that is
 * exactly the kind of gap this file exists to catch. Param segments are
 * dropped: "tools/:category?" is "/tools" as far as pathPrefix is concerned.
 */
const routedPrefixes = (screens = linking.config.screens) =>
  Object.values(screens).flatMap((value) => {
    if (typeof value === 'string') {
      if (value === '') return []; // the root, declared as path "/" not a prefix
      const stat = value.split('/').filter((seg) => !seg.startsWith(':'));
      return [`/${stat.join('/')}`];
    }
    return value?.screens ? routedPrefixes(value.screens) : [];
  });

test('every route the navigator claims is declared in app.json', () => {
  const declared = declaredPrefixes();
  const routed = routedPrefixes();

  // Guard the guard: if this ever comes back empty the assertions below pass
  // vacuously and this file stops testing anything.
  assert.ok(routed.length >= 5, `expected the navigator to route paths, got ${routed.length}`);
  assert.ok(routed.includes('/tools'), 'nested Tools route must be collected');

  for (const path of routed) {
    assert.ok(
      declared.includes(path),
      `linking.ts routes "${path}" but app.json declares no matching pathPrefix, ` +
        `so Android never opens the app for it.`
    );
  }
});

test('crawled marketing URLs land on the screen that matches the page', () => {
  assert.equal(screenFor('https://marketingtool.pro/'), 'Main > Dashboard');
  assert.equal(screenFor('https://app.marketingtool.pro/'), 'Main > Dashboard');
  assert.equal(screenFor('https://www.marketingtool.pro/'), 'Main > Dashboard');
  assert.equal(screenFor('https://marketingtool.pro/pricing/'), 'Subscription');
  assert.equal(screenFor('https://marketingtool.pro/privacy-policy/'), 'Privacy');
  assert.equal(screenFor('https://marketingtool.pro/terms-policy/'), 'Terms');
  assert.equal(screenFor('https://marketingtool.pro/contact/'), 'Contact');
});

test('tool category pages open the tool list, never a hanging ToolDetail', () => {
  // ToolDetailScreen spins forever when tools.find(t => t.slug === toolSlug)
  // misses, and these are marketing category slugs, not app tool slugs.
  const categories = [
    'ai-marketing-agents',
    'analytics',
    'ppc-optimization',
    'content-writing',
    'creative-ads',
    'ecommerce-shopify',
    'seo',
  ];
  for (const category of categories) {
    assert.equal(
      screenFor(`https://marketingtool.pro/tools/${category}/`),
      'Main > Tools',
      `/tools/${category}/ must land on the tool list`
    );
  }
  // The bare listing page resolves too (the :category? param is optional).
  assert.equal(screenFor('https://marketingtool.pro/tools/'), 'Main > Tools');
});

test('pages with no in-app equivalent stay in the browser', () => {
  const webOnly = [
    'https://marketingtool.pro/about/',
    'https://marketingtool.pro/blog/',
    'https://marketingtool.pro/blog/seo-title-tags-that-rank-and-click-the-ai-approach-to-search-optimization/',
    'https://marketingtool.pro/resources/ppc-audit/',
    'https://marketingtool.pro/resources/analytics/',
    'https://marketingtool.pro/solutions/email-campaign/',
    'https://marketingtool.pro/solutions/summary-generator/',
    'https://marketingtool.pro/audit-report/',
    'https://marketingtool.pro/release-notes/',
  ];
  for (const url of webOnly) {
    assert.equal(screenFor(url), null, `${url} has no app screen and must stay on the web`);
  }
});

test('auth.marketingtool.pro is not in the verified App Links set', () => {
  // It serves an Appwrite error page where assetlinks.json must be, so it can
  // never verify; leaving autoVerify on it fails the domain check for the app.
  // OAuth there arrives on the marketingtool:// scheme instead.
  for (const filter of app.android.intentFilters) {
    const hosts = filter.data.map((d) => d.host).filter(Boolean);
    if (hosts.includes('auth.marketingtool.pro')) {
      assert.notEqual(
        filter.autoVerify,
        true,
        'auth.marketingtool.pro cannot serve assetlinks.json, so autoVerify must stay off'
      );
    }
  }
});

test('verified hosts are only ones that serve assetlinks.json', () => {
  const verified = new Set();
  for (const filter of app.android.intentFilters) {
    if (!filter.autoVerify) continue;
    for (const datum of filter.data) {
      if (datum.host) verified.add(datum.host);
    }
  }
  assert.deepEqual(
    [...verified].sort(),
    ['app.marketingtool.pro', 'marketingtool.pro', 'www.marketingtool.pro'],
    'verified host set changed -- confirm the new host serves /.well-known/assetlinks.json'
  );
});
