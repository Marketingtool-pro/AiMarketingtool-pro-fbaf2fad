const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * EAS-Priority Podfile Fix
 * REFINED FIX for Expo 55 + Firebase + RN 0.83
 * Allows non-modular includes while keeping modules enabled for Firebase compatibility.
 */
module.exports = function withEasPodfileFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf8');

      // 1. Force Firebase to NOT use static frameworks (critical for RN 0.83)
      contents = contents.replace(/\$RNFirebaseAsStaticFramework = true/g, '');
      if (!contents.includes('$RNFirebaseAsStaticFramework = false')) {
        contents = '$RNFirebaseAsStaticFramework = false\n' + contents;
      }

      // 2. Clear all previous snippets
      const patterns = [
        /# Robust compatibility[\s\S]*?end\s+end/g,
        /# Surgical compatibility[\s\S]*?end\s+end/g,
        /# Clean Firebase[\s\S]*?end\s+end/g,
        /# Force non-modular includes[\s\S]*?end\s+end/g,
        /# RNFB \+ RN 0.83[\s\S]*?end\s+end/g,
        /# Refined fix[\s\S]*?end\s+end/g
      ];
      patterns.forEach(p => contents = contents.replace(p, ''));

      // 3. Apply the Refined Non-Modular patch
      const snippet = `
    # Refined fix for RNFB + RN 0.83 compatibility
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        # Allow non-modular headers globally
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        bc.build_settings['CLANG_WARN_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'NO'
        
        # Ensure correct C standards for modern RN
        bc.build_settings['GCC_C_LANGUAGE_STANDARD'] = 'gnu11'
        bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-error=implicit-function-declaration -Wno-error=implicit-int'
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
