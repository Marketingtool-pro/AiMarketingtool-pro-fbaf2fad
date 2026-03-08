const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * EAS-Priority Podfile Fix (FINAL VERSION)
 * Specifically targets the RN 0.83 + Firebase cycle of death.
 * Matches Build 130 state but adds surgical module control.
 */
module.exports = function withEasPodfileFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, "utf8");

      // 1. Force Firebase to use STATIC frameworks (Build 130 state)
      contents = contents.replace(/\$RNFirebaseAsStaticFramework = false/g, "");
      if (!contents.includes("$RNFirebaseAsStaticFramework = true")) {
        contents = "$RNFirebaseAsStaticFramework = true\n" + contents;
      }

      // 2. Clear all previous snippets
      const patterns = [
        /# Robust compatibility[\s\S]*?end\s+end/g,
        /# Surgical compatibility[\s\S]*?end\s+end/g,
        /# Clean Firebase[\s\S]*?end\s+end/g,
        /# Force non-modular includes[\s\S]*?end\s+end/g,
        /# RNFB \+ RN 0.83[\s\S]*?end\s+end/g,
        /# Refined fix[\s\S]*?end\s+end/g,
        /# Force Static Non-Modular[\s\S]*?end\s+end/g,
        /# Enable modules for all Firebase[\s\S]*?end\s+end/g
      ];
      patterns.forEach(p => contents = contents.replace(p, ""));

      // 3. Apply the Definitive Surgical Patch
      const snippet = `
    # Definitive Fix for RN 0.83 + Firebase
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        # Allow non-modular headers globally
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        bc.build_settings['CLANG_WARN_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'NO'
        
        # Enable modules by default for Firebase compatibility
        bc.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
        bc.build_settings['DEFINES_MODULE'] = 'YES'
        
        # Ensure correct C standards
        bc.build_settings['GCC_C_LANGUAGE_STANDARD'] = 'gnu11'
        bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-error=implicit-function-declaration -Wno-error=implicit-int'
      end

      # SURGICAL STEP: Disable modules ONLY for the RNFB bridge targets
      # This stops the RCTBridgeModule redefinition error while allowing @import in Firebase headers.
      if target.name == 'RNFBApp' || target.name == 'RNFBAuth' || target.name == 'RNFBFirestore'
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
          bc.build_settings['DEFINES_MODULE'] = 'NO'
        end
      end
    end`;

      if (contents.includes("post_install do |installer|")) {
        contents = contents.replace(
          "post_install do |installer|",
          "post_install do |installer|\n" + snippet
        );
      } else {
        contents += `\npost_install do |installer|\n${snippet}\nend\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
