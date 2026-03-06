const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Ultimate Firebase + RN 0.83 Compatibility Fix (v3)
 * Resolves:
 * 1. "RCTBridgeModule must be imported from module" (by disabling modules for RNFB)
 * 2. "ISO C99 type specifier missing" (by setting correct C/C++ standards)
 * 3. Modular header conflicts with React-Core.
 */
module.exports = function withFirebaseFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf8');

      // 1. Inject global Firebase static framework flag at the top
      if (!contents.includes('$RNFirebaseAsStaticFramework = true')) {
        contents = '$RNFirebaseAsStaticFramework = true\n' + contents;
      }

      // 2. Clean up previous snippets
      contents = contents.replace(/# Aggressive fix for RN 0.83[\s\S]*?end\s+end/g, '');
      contents = contents.replace(/# Firebase \+ RN 0.83 Modular Header Fix[\s\S]*?end\s+end/g, '');
      contents = contents.replace(/# Firebase non-modular header fix[\s\S]*?end\s+end/g, '');
      contents = contents.replace(/# Surgical fix for Firebase[\s\S]*?end\s+end/g, '');
      contents = contents.replace(/# Optimized compatibility fix for RN 0.83 \+ Firebase[\s\S]*?end\s+end/g, '');

      // 3. Robust surgical patch for RN 0.83 + Firebase
      const snippet = `
      # Robust compatibility fix for RN 0.83 + Firebase
      installer.pods_project.targets.each do |target|
      # Apply common fixes to all targets
      target.build_configurations.each do |bc|
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        bc.build_settings['GCC_C_LANGUAGE_STANDARD'] = 'gnu11'
        bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++20'
        bc.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
      end

      # Specific fixes for Firebase modules
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |bc|
          bc.build_settings['DEFINES_MODULE'] = 'YES'
          bc.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
          bc.build_settings['HEADER_SEARCH_PATHS'] = '$(inherited) "\${PODS_ROOT}/Headers/Public/React-Core"'
          # Force ignore legacy C99 errors that crash the build
          bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-error=implicit-function-declaration -Wno-error=implicit-int -Wno-error=error'
        end
      end
      end`;      // 3. Inject into the post_install block
      if (contents.includes('post_install do |installer|')) {
        contents = contents.replace(
          'post_install do |installer|',
          'post_install do |installer|' + snippet
        );
      } else {
        const postInstallBlock = `
post_install do |installer|
${snippet}
end
`;
        contents += postInstallBlock;
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
