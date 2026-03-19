const { withDangerousMod, withAndroidStyles } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Android 15 Edge-to-Edge Fix
 *
 * Fixes deprecated APIs:
 * - Window.getStatusBarColor / setStatusBarColor / setNavigationBarColor
 * - LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES / DEFAULT
 *
 * Sets proper Android 15 edge-to-edge display mode and transparent bars.
 */
module.exports = function withAndroid15EdgeToEdge(config) {
  // Step 1: Patch styles.xml to use edge-to-edge compatible values
  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults;

    // Find or create the AppTheme style
    const appTheme = styles.resources.style?.find(
      (s) => s.$.name === 'AppTheme'
    );

    if (appTheme) {
      // Remove deprecated status/nav bar color items if present
      if (appTheme.item) {
        appTheme.item = appTheme.item.filter(
          (item) =>
            item.$.name !== 'android:statusBarColor' &&
            item.$.name !== 'android:navigationBarColor' &&
            item.$.name !== 'android:windowLayoutInDisplayCutoutMode' &&
            item.$.name !== 'android:enforceEdgeToEdge' &&
            item.$.name !== 'android:windowTranslucentStatus' &&
            item.$.name !== 'android:windowTranslucentNavigation'
        );
      } else {
        appTheme.item = [];
      }

      // Add Android 15 compatible values
      appTheme.item.push(
        { $: { name: 'android:statusBarColor' }, _: '@android:color/transparent' },
        { $: { name: 'android:navigationBarColor' }, _: '@android:color/transparent' },
        { $: { name: 'android:windowLayoutInDisplayCutoutMode' }, _: 'always' },
        { $: { name: 'android:windowTranslucentStatus' }, _: 'false' },
        { $: { name: 'android:windowTranslucentNavigation' }, _: 'false' }
      );
    }

    return config;
  });

  // Step 2: Create a values-v35 folder with edge-to-edge opt-in for Android 15
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'res'
      );

      // values-v35 for Android 15 (API 35)
      const v35Dir = path.join(resDir, 'values-v35');
      if (!fs.existsSync(v35Dir)) {
        fs.mkdirSync(v35Dir, { recursive: true });
      }

      const v35Styles = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.EdgeToEdge">
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
        <item name="android:windowLayoutInDisplayCutoutMode">always</item>
        <item name="android:windowOptOutEdgeToEdgeEnforcement">false</item>
    </style>
</resources>
`;
      fs.writeFileSync(path.join(v35Dir, 'styles.xml'), v35Styles);

      return config;
    },
  ]);

  return config;
};
