const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * EAS-Priority Podfile Fix
 * RESTORED TO SUCCESSFUL BUILD 130 STATE
 * Force Firebase to use STATIC frameworks and DISABLE modules to avoid RCTBridgeModule conflicts.
 */
module.exports = function withEasPodfileFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, "utf8");

      // 1. Force Firebase to use STATIC frameworks
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
        /# Refined fix for RNFB \+ RN 0.83 compatibility[\s\S]*?end\s+end/g,
        /# Enable modules for all Firebase[\s\S]*?end\s+end/g,
        /# Surgical fix for RNFB \+ RN 0.83[\s\S]*?end\s+end/g
      ];
      patterns.forEach(p => contents = contents.replace(p, ""));

      // 3. Apply the Static Non-Modular patch (Same as successful Build 130)
      const snippet = `
    # Force Static Non-Modular for Firebase (Build 130 state)
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        bc.build_settings['CLANG_WARN_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'NO'
        bc.build_settings['GCC_C_LANGUAGE_STANDARD'] = 'gnu11'
        bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-error=implicit-function-declaration -Wno-error=implicit-int'
      end

      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |bc|
          bc.build_settings['DEFINES_MODULE'] = 'NO'
          bc.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
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
