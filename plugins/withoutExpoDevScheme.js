const { withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

/**
 * Strip the Expo dev-client scheme (exp+marketingtool://) from release builds.
 *
 * `expo prebuild` adds exp+<slug> alongside the real `marketingtool` scheme so
 * the dev launcher can hand off to the app. That scheme has no place in a Play
 * release: it is an unauthenticated entry point into the same deep-link routes.
 *
 * Only production EAS builds are stripped -- development and preview keep the
 * dev scheme, otherwise the dev client can no longer open the app.
 */
const isProduction = () => process.env.EAS_BUILD_PROFILE === 'production';

const withoutIosDevScheme = (config) => {
  return withInfoPlist(config, (cfg) => {
    if (!isProduction()) return cfg;

    const urlTypes = cfg.modResults.CFBundleURLTypes;
    if (!Array.isArray(urlTypes)) return cfg;

    cfg.modResults.CFBundleURLTypes = urlTypes
      .map((entry) => ({
        ...entry,
        CFBundleURLSchemes: (entry.CFBundleURLSchemes ?? []).filter(
          (scheme) => !String(scheme).startsWith('exp+'),
        ),
      }))
      .filter((entry) => entry.CFBundleURLSchemes.length > 0);

    return cfg;
  });
};

const withoutAndroidDevScheme = (config) => {
  return withAndroidManifest(config, (cfg) => {
    if (!isProduction()) return cfg;

    const application = cfg.modResults.manifest.application?.[0];
    if (!application?.activity) return cfg;

    for (const activity of application.activity) {
      if (!activity['intent-filter']) continue;

      for (const filter of activity['intent-filter']) {
        if (!filter.data) continue;
        filter.data = filter.data.filter(
          (d) => !String(d.$?.['android:scheme'] ?? '').startsWith('exp+'),
        );
      }

      // Drop any VIEW filter left with no data element at all.
      activity['intent-filter'] = activity['intent-filter'].filter(
        (filter) => !('data' in filter) || filter.data.length > 0,
      );
    }

    return cfg;
  });
};

const withoutExpoDevScheme = (config) =>
  withoutIosDevScheme(withoutAndroidDevScheme(config));

module.exports = withoutExpoDevScheme;
