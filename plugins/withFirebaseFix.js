const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebaseFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        return config;
      }

      const snippet = `
    # Firebase non-modular header fix
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end`;

      if (contents.includes('post_install do |installer|')) {
        contents = contents.replace(
          'post_install do |installer|',
          'post_install do |installer|' + snippet
        );
      } else if (contents.match(/post_install\s+do\s+\|installer\|/)) {
        contents = contents.replace(
          /post_install\s+do\s+\|installer\|/,
          'post_install do |installer|' + snippet
        );
      } else {
        const lastEnd = contents.lastIndexOf('\nend');
        if (lastEnd !== -1) {
          const postInstallBlock = `
  post_install do |installer|
${snippet}
  end
`;
          contents = contents.slice(0, lastEnd) + postInstallBlock + contents.slice(lastEnd);
        }
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
