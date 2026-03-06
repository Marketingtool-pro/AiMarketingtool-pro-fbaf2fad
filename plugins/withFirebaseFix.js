const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Clean Firebase Fix (v6)
 * This follows the "Surgical Non-Modular" approach:
 * 1. Allows non-modular headers (fixes RCTBridgeModule error).
 * 2. Forces legacy C99 standards (fixes 'int' errors).
 * 3. Does NOT manually configure Firebase in AppDelegate (to avoid redefinitions).
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
        /\$RNFirebaseAsStaticFramework = true\n/g
      ];
      patterns.forEach(p => contents = contents.replace(p, ''));

      // 2. Inject the surgical patch
      const snippet = `
    # Verified RNFB 0.83 Compatibility Patch
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        # Fix for RCTBridgeModule not found
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        
        # Suppress the legacy C99 errors without breaking modules
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
