const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * THE DEFINITIVE FIX for Expo 55 + Firebase (v8)
 * Targets the specific "must be imported from module" and "implicit int" errors.
 */
module.exports = function withEasPodfileFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf8');

      // 1. Force Firebase to NOT use static frameworks (this is the root cause)
      contents = contents.replace(/\$RNFirebaseAsStaticFramework = true/g, '');
      if (!contents.includes('$RNFirebaseAsStaticFramework = false')) {
        contents = '$RNFirebaseAsStaticFramework = false\n' + contents;
      }

      // 2. Clear all previous snippets
      const patterns = [
        /# Robust compatibility[\s\S]*?end\s+end/g,
        /# Surgical compatibility[\s\S]*?end\s+end/g,
        /# Clean Firebase[\s\S]*?end\s+end/g,
        /# Force non-modular includes[\s\S]*?end\s+end/g
      ];
      patterns.forEach(p => contents = contents.replace(p, ''));

      // 3. Apply the "Surgical Non-Modular" patch
      const snippet = `
    # Surgical fix for RNFB + RN 0.83
    installer.pods_project.targets.each do |target|
      # Fix for all targets to allow mixing headers
      target.build_configurations.each do |bc|
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end

      # Specific fix for Firebase: DISABLE modules for them so they can see React headers
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |bc|
          bc.build_settings['DEFINES_MODULE'] = 'NO'
          bc.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
          
          # Kill the C99 errors
          bc.build_settings['GCC_C_LANGUAGE_STANDARD'] = 'gnu11'
          bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-error=implicit-function-declaration -Wno-error=implicit-int'
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
