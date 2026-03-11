const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * REFINED FIREBASE FIX (v9) - The "Middle Path"
 * 1. Keeps $RNFirebaseAsStaticFramework = true (Required for modern Firebase)
 * 2. Does NOT disable modules (fixes FirebaseCoreInternal error)
 * 3. Forces headers to be visible across module boundaries (fixes RCTBridgeModule error)
 */
module.exports = function withEasPodfileFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf8');

      // 1. Clean up ALL previous snippets
      const patterns = [
        /# Robust compatibility[\s\S]*?end\s+end/g,
        /# Surgical compatibility[\s\S]*?end\s+end/g,
        /# Clean Firebase[\s\S]*?end\s+end/g,
        /# Force non-modular includes[\s\S]*?end\s+end/g,
        /# Surgical fix for RNFB[\s\S]*?end\s+end/g,
        /\$RNFirebaseAsStaticFramework = (true|false)\n/g
      ];
      patterns.forEach(p => contents = contents.replace(p, ''));

      // 2. Set the global static framework flag to TRUE (Standard for RNFB)
      contents = '$RNFirebaseAsStaticFramework = true\n' + contents;

      // 3. Apply the "Refined Static" patch
      const snippet = `
    # Refined Static Fix for RNFB + RN 0.83
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        # Allow mixing headers
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        
        # This is the "Middle Path": Keep modules ENABLED but fix the visibility
        if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
          bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-error=implicit-function-declaration -Wno-error=implicit-int -Wno-non-modular-include-in-framework-module'
          bc.build_settings['HEADER_SEARCH_PATHS'] = '$(inherited) "$(PODS_ROOT)/Headers/Public/React-Core"'
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
