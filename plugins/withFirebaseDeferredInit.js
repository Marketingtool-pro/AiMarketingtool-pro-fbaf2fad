const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

/**
 * Disable Firebase auto-init for Messaging / Analytics / Crashlytics so the
 * SDK doesn't fire FID registration + token fetch on cold start. On low-end
 * Android devices in markets with bad networks (India: Infinix, realme,
 * vivo), the FID network call hangs and FCM's blockingGetToken loop ANRs
 * the app — confirmed by the Play Console stack trace where TAG thread
 * is parked in CountDownLatch.await > Tasks.await > FirebaseMessaging.
 *
 * App.tsx re-enables collection in deferredInit() after onLayoutRootView
 * fires, so the user-visible startup completes BEFORE Firebase reaches
 * for the network.
 */
module.exports = function withFirebaseDeferredInit(config) {
  return withAndroidManifest(config, async (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    const flags = [
      ['firebase_messaging_auto_init_enabled', 'false'],
      ['firebase_analytics_collection_enabled', 'false'],
      ['firebase_crashlytics_collection_enabled', 'false'],
      ['firebase_performance_collection_enabled', 'false'],
    ];
    for (const [name, value] of flags) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, name, value);
    }
    return config;
  });
};
