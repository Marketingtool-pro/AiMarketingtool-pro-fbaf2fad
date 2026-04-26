const fs = require('fs');
const path = require('path');
const withEasPodfileFix = require('./plugins/withEasPodfileFix');
const withKotlinKspFix = require('./plugins/withKotlinKspFix');
const withAndroid15EdgeToEdge = require('./plugins/withAndroid15EdgeToEdge');
const withAndroidAbiFilters = require('./plugins/withAndroidAbiFilters');

/**
 * AI Marketing Tool - Mobile Config (2026)
 */
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    [withEasPodfileFix],
    [withKotlinKspFix, {
      kotlinVersion: '2.1.20',
      kspVersion: '2.1.20-1.0.32',
      gradleVersion: '8.13',
    }],
    [withAndroid15EdgeToEdge],
    [
      "expo-build-properties",
      {
        "ios": {
          "useFrameworks": "static",
          "deploymentTarget": "16.0",
          "storeKitVersion": "2",
          "forceStaticLinking": [
            "RNFBApp",
            "RNFBAuth",
            "RNFBCrashlytics",
            "RNFBFirestore",
            "RNFBMessaging"
          ]
        },
        "android": {
          "compileSdkVersion": 36,
          "targetSdkVersion": 35,
          "minSdkVersion": 24,
          "kotlinVersion": "2.1.20",
          "kspVersion": "2.1.20-1.0.32",
          "ndkVersion": "26.1.10909125",
          "cmakeVersion": "3.22.1"
        }
      }
    ],
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "@react-native-firebase/crashlytics",
    "react-native-iap",
    "expo-secure-store",
    "expo-font",
    "expo-web-browser",
    "expo-asset"
  ]
});
