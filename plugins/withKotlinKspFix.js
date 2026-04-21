const { withProjectBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  kotlinVersion: '2.1.20',
  kspVersion: '2.1.20-1.0.32',
  agpVersion: '8.7.2',
  googlePlayServicesVersion: '18.0.0',
  gradleVersion: '8.10.2',
};

/**
 * Android build.gradle + Gradle wrapper fixes for Expo SDK 55 / RN 0.83.
 */
const withKotlinKspFix = (config, options) => {
  console.log('[withKotlinKspFix] Executing Kotlin/KSP/Gradle fix...');
  const opts = { ...DEFAULTS, ...(options || {}) };
  const { kotlinVersion, kspVersion, agpVersion, googlePlayServicesVersion, gradleVersion } = opts;

  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    let buildGradle = config.modResults.contents;

    const varsToEnsure = [
      { name: 'kotlinVersion', value: `'${kotlinVersion}'` },
      { name: 'kspVersion', value: `'${kspVersion}'` },
      { name: 'googlePlayServicesVersion', value: `"${googlePlayServicesVersion}"` },
    ];
    
    const missing = varsToEnsure.filter(v => !new RegExp(`\\b${v.name}\\s*=`).test(buildGradle));

    if (missing.length > 0) {
      const injectedLines = missing.map(v => `        ${v.name} = ${v.value}`).join('\n');
      if (/ext\s*\{/.test(buildGradle)) {
        buildGradle = buildGradle.replace(/ext\s*\{/, `ext {\n${injectedLines}`);
      }
    }

    // 🚨 AGP FIX: Ensure com.android.tools.build:gradle HAS a version
    if (!buildGradle.includes(`com.android.tools.build:gradle:${agpVersion}`)) {
        buildGradle = buildGradle.replace(
            /classpath\s*(?:\(\s*)?['"]com\.android\.tools\.build:gradle(?::[^'"]*)?['"]\s*\)?/g,
            `classpath("com.android.tools.build:gradle:${agpVersion}")`
        );
    }

    // Rewrite Kotlin gradle-plugin classpath
    if (!buildGradle.includes(`org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}`)) {
      buildGradle = buildGradle.replace(
        /classpath\s*(?:\(\s*)?['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin(?::[^'"]*)?['"]\s*\)?/g,
        `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")`
      );
    }

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
    if (!buildGradle.includes('resolutionStrategy.eachDependency')) {
      buildGradle += resolutionStrategy;
    }

    config.modResults.contents = buildGradle;
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const wrapperPath = path.join(projectRoot, 'gradle', 'wrapper', 'gradle-wrapper.properties');
      if (fs.existsSync(wrapperPath)) {
        let content = fs.readFileSync(wrapperPath, 'utf8');
        // Robust replacement for distributionUrl
        const lines = content.split('\n');
        const updatedLines = lines.map(line => {
          if (line.startsWith('distributionUrl=')) {
            return `distributionUrl=https\\://services.gradle.org/distributions/gradle-${gradleVersion}-bin.zip`;
          }
          return line;
        });
        fs.writeFileSync(wrapperPath, updatedLines.join('\n'));
      }
      return config;
    },
  ]);

  return config;
};

module.exports = withKotlinKspFix;
