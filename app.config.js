module.exports = ({ config }) => ({
  ...config,
  plugins: [
    [
      "expo-build-properties",
      {
        "ios": {
          "useFrameworks": "dynamic",
          "deploymentTarget": "16.0"
        },
        "android": {
          "compileSdkVersion": 35,
          "targetSdkVersion": 35,
          "minSdkVersion": 24
        }
      }
    ],
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "expo-secure-store",
    "expo-font",
    "expo-sharing",
    "expo-web-browser",
    "expo-asset"
  ]
});
