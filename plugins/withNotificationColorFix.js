const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const { getMainApplicationOrThrow } = AndroidConfig.Manifest;

// expo-notifications and @react-native-firebase/messaging BOTH declare
//   <meta-data android:name="com.google.firebase.messaging.default_notification_color" />
// expo-notifications points it at @color/notification_icon_color (our #7C3AED from
// app.json); the Firebase library points it at @color/white. The manifest merger
// refuses to choose and fails :app:processReleaseMainManifest with:
//
//   Attribute meta-data#com.google.firebase.messaging.default_notification_color@resource
//   value=(@color/notification_icon_color) is also present at
//   [:react-native-firebase_messaging] value=(@color/white).
//   Suggestion: add tools:replace="android:resource"
//
// This applies exactly that suggestion so our brand colour wins the merge.
const META_NAME = 'com.google.firebase.messaging.default_notification_color';

module.exports = function withNotificationColorFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // tools: namespace must be declared on <manifest> for tools:replace to parse.
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const application = getMainApplicationOrThrow(config.modResults);
    const metaData = application['meta-data'] || [];

    let entry = metaData.find(
      (item) => item.$ && item.$['android:name'] === META_NAME
    );

    if (!entry) {
      entry = {
        $: {
          'android:name': META_NAME,
          'android:resource': '@color/notification_icon_color',
        },
      };
      metaData.push(entry);
      application['meta-data'] = metaData;
    }

    entry.$['tools:replace'] = 'android:resource';

    return config;
  });
};
