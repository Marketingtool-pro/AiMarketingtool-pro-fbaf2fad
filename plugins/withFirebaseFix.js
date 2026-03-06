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

      // 1. Clean up previous snippets
      contents = contents.replace(/# Aggressive fix for RN 0.83[\s\S]*?end\s+end/g, '');
      contents = contents.replace(/# Firebase \+ RN 0.83 Modular Header Fix[\s\S]*?end\s+end/g, '');
      contents = contents.replace(/# Firebase non-modular header fix[\s\S]*?end\s+end/g, '');
      contents = contents.replace(/# Surgical fix for Firebase[\s\S]*?end\s+end/g, '');

      // 2. Refined surgical patch
      const snippet = `
    # Aggressive compatibility fix for RN 0.83 + Firebase
    installer.pods_project.targets.each do |target|
      # Fix for Yoga/Core and non-modular headers
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          bc.build_settings['DEFINES_MODULE'] = 'NO'
          bc.build_settings['CLANG_ENABLE_MODULES'] = 'NO'

          # Force modern standards to avoid C99 errors
          bc.build_settings['GCC_C_LANGUAGE_STANDARD'] = 'gnu11'
          bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++20'

          # Ensure React-Core headers are visible for protocols
          bc.build_settings['HEADER_SEARCH_PATHS'] = '$(inherited) "\${PODS_ROOT}/Headers/Public/React-Core"'
        end
      end
    end`;
      // 3. Inject into the post_install block
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
