const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Ultimate Firebase Fix (v7)
 * Force Firebase to use DYNAMIC frameworks instead of static.
 * This is the ONLY reliable fix for the RCTBridgeModule redefinition error in RN 0.83.
 */
module.exports = function withFirebaseFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf8');

      // 1. Clean up ALL previous injected snippets
      const patterns = [
        /# Aggressive fix[\s\S]*?end\s+end/g,
        /# Firebase \+ RN 0.83[\s\S]*?end\s+end/g,
        /# Firebase non-modular[\s\S]*?end\s+end/g,
        /# Surgical fix[\s\S]*?end\s+end/g,
        /# Optimized compatibility[\s\S]*?end\s+end/g,
        /# Robust compatibility[\s\S]*?end\s+end/g,
        /# Surgical compatibility[\s\S]*?end\s+end/g,
        /# Clean Firebase[\s\S]*?end\s+end/g,
        /# Verified RNFB[\s\S]*?end\s+end/g,
        /\$RNFirebaseAsStaticFramework = true\n/g,
        /\$RNFirebaseAsStaticFramework = false\n/g
      ];
      patterns.forEach(p => contents = contents.replace(p, ''));

      // 2. Force DYNAMIC framework flag at the top
      contents = '$RNFirebaseAsStaticFramework = false\n' + contents;

      // 3. Apply the dynamic framework compatibility patch
      const snippet = `
    # Force Firebase Dynamic Frameworks
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          bc.build_settings['DEFINES_MODULE'] = 'YES'
          bc.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
        end
      end
    end`;

      if (contents.includes('post_install do |installer|')) {
        contents = contents.replace(
          'post_install do |installer|',
          'post_install do |installer|\n' + snippet
        );
      } else {
        contents += `\npost_install do |installer|\n${snippet}\nend\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
