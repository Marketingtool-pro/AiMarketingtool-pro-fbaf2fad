const { withProjectBuildGradle } = require('@expo/config-plugins');

const withKotlinKspFix = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;

      const KOTLIN_VERSION = "2.0.20";
      const KSP_VERSION = "2.0.20-1.0.25";

      // 1. Force versions in the ext block
      if (!buildGradle.includes("kotlinVersion =")) {
        buildGradle = buildGradle.replace(
          /buildscript \{/,
          `buildscript {\n    ext {\n        kotlinVersion = '${KOTLIN_VERSION}'\n        kspVersion = '${KSP_VERSION}'\n    }`
        );
      } else {
        buildGradle = buildGradle.replace(/kotlinVersion = .*/g, `kotlinVersion = '${KOTLIN_VERSION}'`);
        buildGradle = buildGradle.replace(/kspVersion = .*/g, `kspVersion = '${KSP_VERSION}'`);
      }

      // 2. Force the correct classpath in buildscript dependencies
      if (!buildGradle.includes(`org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}`)) {
         buildGradle = buildGradle.replace(
            /classpath\('org.jetbrains.kotlin:kotlin-gradle-plugin'\)/,
            `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}")`
         );
      }

      // 3. Force resolution strategy for all subprojects to strictly use the defined Kotlin version
      const resolutionStrategy = `
allprojects {
    configurations.all {
        resolutionStrategy.eachDependency { DependencyResolveDetails details ->
            def requested = details.requested
            if (requested.group == 'org.jetbrains.kotlin' && requested.name.startsWith('kotlin-')) {
                details.useVersion kotlinVersion
            }
            if (requested.group == 'com.google.devtools.ksp') {
                details.useVersion kspVersion
            }
        }
    }
}
`;
      if (!buildGradle.includes("resolutionStrategy.eachDependency")) {
        buildGradle += resolutionStrategy;
      }

      config.modResults.contents = buildGradle;
    }
    return config;
  });
};

module.exports = withKotlinKspFix;

