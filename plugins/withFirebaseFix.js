const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * DYNAMIC FRAMEWORK FIREBASE FIX (v15)
 * The definitive fix for RN 0.83.2 + Firebase.
 * Specifically handles the header mapping for dynamic frameworks.
 */
module.exports = function withFirebaseFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf8');

      // 1. Ensure the Dynamic Framework flag is set at the top
      if (!contents.includes('$RNFirebaseAsStaticFramework = false')) {
        contents = '$RNFirebaseAsStaticFramework = false\n' + contents;
      }

      // 2. Add the dynamic header patch
      const snippet = `
    # Bridge React headers for Firebase dynamic frameworks
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |bc|
          bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -DRNFB_DYNAMIC_FRAMEWORKS=1'
          bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          bc.build_settings['DEFINES_MODULE'] = 'YES'
        end
      end
    end`;

      if (contents.includes('post_install do |installer|')) {
        if (!contents.includes('RNFB_DYNAMIC_FRAMEWORKS')) {
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
