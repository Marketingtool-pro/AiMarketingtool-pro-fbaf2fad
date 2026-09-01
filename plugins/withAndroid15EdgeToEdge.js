const { withDangerousMod, withAndroidStyles, withMainActivity } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Android 15 Edge-to-Edge — deprecation-clean rewrite.
 *
 * Why the previous version of this plugin still tripped Play Console's
 * "deprecated APIs" warning: it WROTE android:statusBarColor /
 * navigationBarColor / windowLayoutInDisplayCutoutMode into styles.xml.
 * Even setting them to @android:color/transparent counts as USING the
 * deprecated setters under static analysis.
 *
 * Correct Android 15 approach (and what this plugin now does):
 *   1. MainActivity.onCreate calls enableEdgeToEdge() — handles transparent
 *      system bars without touching the deprecated APIs.
 *   2. WindowInsetsControllerCompat sets system-bar icon appearance
 *      (Light/Dark) — modern, non-deprecated.
 *   3. styles.xml is STRIPPED of the three deprecated attrs (and never
 *      gains them again).
 *   4. values-v35/styles.xml is REMOVED — no per-API-level overrides
 *      needed once enableEdgeToEdge is in place.
 *   5. gradle.properties opts into Expo SDK 55's official flag
 *      (expo.edgeToEdgeEnabled=true) which wires up react-native-edge-to-edge.
 */
module.exports = function withAndroid15EdgeToEdge(config, options = {}) {
  const preferLightStatusBar = options.preferLightStatusBar === true;

  // Step 1: Inject enableEdgeToEdge() into MainActivity (Kotlin only)
  config = withMainActivity(config, (config) => {
    const lang = config.modResults.language;
    if (lang !== 'kt' && lang !== 'kotlin') {
      if (lang === 'java') {
        console.warn('[withAndroid15EdgeToEdge] MainActivity is Java; this plugin only patches Kotlin. Convert MainActivity to Kotlin or add enableEdgeToEdge() in onCreate manually.');      }
      return config;
    }

    let content = config.modResults.contents;
    const superOnCreatePattern = /super\.onCreate\((null|savedInstanceState)\)/;
    const alreadyPatched = content.includes('enableEdgeToEdge()');
    if (alreadyPatched || !superOnCreatePattern.test(content)) {
      config.modResults.contents = content;
      return config;
    }

    if (!content.includes('import androidx.activity.enableEdgeToEdge')) {
      content = content.replace(
        /import com\.facebook\.react\.ReactActivity/,
        `import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity`
      );
    }

    const match = content.match(superOnCreatePattern);
    content = content.replace(
      match[0],
      `enableEdgeToEdge()
    ${match[0]}

    val controller = WindowInsetsControllerCompat(window, window.decorView)
    controller.isAppearanceLightStatusBars = ${preferLightStatusBar}
    controller.isAppearanceLightNavigationBars = ${preferLightStatusBar}`
    );

    config.modResults.contents = content;
    return config;
  });

  // Step 2: Scrub the deprecated COLOUR attrs from AppTheme, and pin the
  // display-cutout mode to `always`.
  //
  // windowLayoutInDisplayCutoutMode used to be stripped here too, on the theory
  // that setting it at all counts as using a deprecated API. That is true for
  // statusBarColor / navigationBarColor, but NOT for the cutout mode, and
  // stripping it actively caused the Play Console finding. From Google's own
  // Android 15 behaviour-changes page:
  //
  //   "layoutInDisplayCutoutMode of non-floating windows must be
  //    LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS. SHORT_EDGES, NEVER, and DEFAULT
  //    are interpreted as ALWAYS"
  //
  // and its "deprecated APIs" list names statusBarColor, navigationBarColor,
  // navigationBarDividerColor and setDecorFitsSystemWindows -- it does NOT name
  // layoutInDisplayCutoutMode. ALWAYS is the supported value; DEFAULT,
  // SHORT_EDGES and NEVER are the flagged ones.
  //
  // With the attribute removed the theme fell back to DEFAULT, which is exactly
  // what Play reports against 1.5.19:
  //   LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT
  //   LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
  // Setting it explicitly to `always` is the documented migration.
  const CUTOUT_ATTR = 'android:windowLayoutInDisplayCutoutMode';
  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults;
    const appTheme = styles.resources.style?.find((s) => s.$.name === 'AppTheme');
    if (!appTheme) return config;
    if (!appTheme.item) appTheme.item = [];

    appTheme.item = appTheme.item.filter(
      (item) =>
        item.$.name !== 'android:statusBarColor' &&
        item.$.name !== 'android:navigationBarColor' &&
        item.$.name !== CUTOUT_ATTR &&
        item.$.name !== 'android:enforceEdgeToEdge' &&
        item.$.name !== 'android:windowTranslucentStatus' &&
        item.$.name !== 'android:windowTranslucentNavigation'
    );

    // Re-add the cutout mode with the one value Android 15 accepts.
    appTheme.item.push({ $: { name: CUTOUT_ATTR }, _: 'always' });

    return config;
  });

  // Step 3: Remove leftover values-v35 overrides + opt into Expo 55 flag.
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;

      // Drop any pre-existing values-v35 styles.xml so it can't reintroduce
      // the deprecated attrs on a subsequent build.
      const v35Styles = path.join(projectRoot, 'app', 'src', 'main', 'res', 'values-v35', 'styles.xml');
      if (fs.existsSync(v35Styles)) {
        fs.rmSync(v35Styles, { force: true });
      }

      // Opt into Expo SDK 55's edge-to-edge plumbing. Removes any prior
      // unofficial flags that earlier versions of this plugin wrote.
      const gradlePropsPath = path.join(projectRoot, 'gradle.properties');
      if (fs.existsSync(gradlePropsPath)) {
        let props = fs.readFileSync(gradlePropsPath, 'utf8');
        const cleaned = props
          .split('\n')
          .filter((line) => {
            const t = line.trim();
            return (
              !t.startsWith('reactNativeEdgeToEdge=') &&
              !t.startsWith('android.enableEdgeToEdgeEnforcement=')
            );
          })
          .join('\n');

        let next = cleaned;
        if (!/^expo\.edgeToEdgeEnabled\s*=/m.test(next)) {
          next = next.replace(/\s*$/, '') + '\n\n# Expo SDK 55 edge-to-edge — wires up react-native-edge-to-edge\nexpo.edgeToEdgeEnabled=true\n';
        }
        if (next !== props) {
          fs.writeFileSync(gradlePropsPath, next);
        }
      }

      return config;
    },
  ]);

  return config;
};
