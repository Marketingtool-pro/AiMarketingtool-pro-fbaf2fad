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

      // 2. Remove SWIFT_VERSION = '5.0' from project-level settings (breaks @MainActor)
      contents = contents.replace(/bc\.build_settings\['SWIFT_VERSION'\]\s*=\s*'5\.0'/g, "# REMOVED: SWIFT_VERSION 5.0 breaks @MainActor");

      // 3. Set the global static framework flag to TRUE (Standard for RNFB)
      contents = '$RNFirebaseAsStaticFramework = true\n' + contents;

      // 3. Apply the "Robust Modular" patch
      const snippet = `
    # Force modular headers for Firebase to fix "expected a type" error
    pod 'Firebase', :modular_headers => true
    pod 'FirebaseCore', :modular_headers => true
    pod 'FirebaseFirestore', :modular_headers => true
    pod 'RNFBFirestore', :modular_headers => true
    pod 'FirebaseAuth', :modular_headers => true
    pod 'FirebaseAppCheck', :modular_headers => true
    pod 'GoogleUtilities', :modular_headers => true
    pod 'FirebaseCoreInternal', :modular_headers => true
    pod 'FirebaseAnalytics', :modular_headers => true
    pod 'GoogleAppMeasurement', :modular_headers => true

    # Fix project-level SWIFT_VERSION — 5.0 breaks @MainActor
    installer.pods_project.build_configurations.each do |bc|
      bc.build_settings.delete('SWIFT_VERSION')
    end

    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        # Allow mixing headers across all targets
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        bc.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
        bc.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
        bc.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-error=implicit-function-declaration -Wno-error=implicit-int -Wno-implicit-int -Wno-implicit-function-declaration -Wno-non-modular-include-in-framework-module -Wno-everything -Wno-return-type -ferror-limit=0'
        bc.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        bc.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        bc.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
        bc.build_settings['OTHER_SWIFT_FLAGS'] = '$(inherited) -Xfrontend -strict-concurrency=minimal'
        bc.build_settings['GCC_C_LANGUAGE_STANDARD'] = 'gnu11'

        # Force Swift 6.0 language mode for ALL pods
        # expo-modules-core uses Swift 6 syntax: "extension UIView: @MainActor Protocol"
        # This conformance syntax only exists in Swift 6 mode. Combined with
        # SWIFT_STRICT_CONCURRENCY=minimal above, violations become warnings not errors.
        bc.build_settings['SWIFT_VERSION'] = '6.0'

        # Firebase + RNFB header search paths + Xcode 26 module fix
        if target.name.start_with?('RNFB') || target.name.start_with?('Firebase') || target.name.start_with?('RNIap') || target.name.start_with?('NitroIap') || target.name.start_with?('Nitro') || target.name == 'RNFBApp'
          bc.build_settings['HEADER_SEARCH_PATHS'] = '$(inherited) "$(PODS_ROOT)/Headers/Public/React-Core" "$(PODS_ROOT)/Headers/Public/React-RCTBridge" "$(PODS_CONFIGURATION_BUILD_DIR)/FirebaseFirestore/FirebaseFirestore.framework/Headers" "$(PODS_ROOT)/Headers/Public/FirebaseCore" "$(PODS_ROOT)/Headers/Public/FirebaseAuth" "$(PODS_ROOT)/Headers/Public/FirebaseAppCheck" "$(PODS_ROOT)/Headers/Public/React-bridging"'
        end

        # Xcode 26 fix: disable explicit modules for RNFB to prevent
        # "declaration of RCTBridgeModule must be imported from module" and
        # "redefinition of RCT_EXPORT_METHOD" errors
        if target.name.start_with?('RNFB')
          bc.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
          bc.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
          bc.build_settings['DEFINES_MODULE'] = 'NO'
        end

        # react-native-iap (NitroIap) StoreKit 2 fix
        if target.name == 'RNIap' || target.name == 'NitroIap' || target.name.start_with?('NitroIap') || target.name.start_with?('NitroModules')
          bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-everything -Wno-error=implicit-int -Wno-error=implicit-function-declaration'
          bc.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        end

        # Skia static frameworks fix
        if target.name.include?('react-native-skia') || target.name.include?('RNSkia')
          bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-everything'
          bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end`;

      // Inject AFTER react_native_post_install so our build settings override RN's defaults
      const rnpiRegex = /react_native_post_install\([\s\S]*?\)\s*\n/;
      if (rnpiRegex.test(contents)) {
        contents = contents.replace(rnpiRegex, (match) => match + '\n' + snippet + '\n');
      } else if (contents.includes('post_install do |installer|')) {
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
