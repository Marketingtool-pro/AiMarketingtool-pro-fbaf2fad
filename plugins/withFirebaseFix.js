const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * CLINICAL FIREBASE FIX (v11)
 * The most surgical fix for RN 0.83.2 + Firebase.
 * Inhibits all warnings and relaxes C99 checks for Firebase pods.
 */
module.exports = function withFirebaseFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf8');

      // 1. Force Dynamic Frameworks
      if (!contents.includes('$RNFirebaseAsStaticFramework = false')) {
        contents = '$RNFirebaseAsStaticFramework = false\n' + contents;
      }

      // 2. Add the Bypass Patch
      const snippet = `
    # Bypass strict C99 checks for Firebase + RNFB
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |bc|
          bc.build_settings['GCC_WARN_INHIBIT_ALL_WARNINGS'] = 'YES'
          bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          bc.build_settings['DEFINES_MODULE'] = 'YES'
          bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -DRNFB_DYNAMIC_FRAMEWORKS=1 -Wno-error=implicit-function-declaration -Wno-error=implicit-int'
        end
      end
    end`;

      if (contents.includes('post_install do |installer|')) {
        if (!contents.includes('GCC_WARN_INHIBIT_ALL_WARNINGS')) {
          contents = contents.replace(
            'post_install do |installer|',
            'post_install do |installer|\n' + snippet
          );
        }
      } else {
        contents += `\npost_install do |installer|\n${snippet}\nend\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
