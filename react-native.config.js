module.exports = {
  dependencies: {
    'react-native-iap': {
      platforms: {
        ios: null, // Disable on iOS — native code has compilation errors with Expo SDK 55. iOS uses Stripe fallback.
      },
    },
  },
};
