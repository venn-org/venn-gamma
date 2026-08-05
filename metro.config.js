const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Sentry's Expo-specific config getter, used in place of expo/metro-config's
// getDefaultConfig(). It stamps each bundle and its source map with a matching
// Debug ID, which is how Sentry pairs a minified production stack frame back to
// real source — without it the upload still succeeds and the traces stay
// unreadable.
//
// This has to be `getSentryExpoConfig` rather than
// `withSentryConfig(getDefaultConfig(...))`: the latter's serializer assumes a
// bundle shape Expo's web export doesn't produce, and fails the build in
// determineDebugIdFromBundleSource with "Cannot read properties of undefined
// (reading 'match')".
const config = getSentryExpoConfig(__dirname);

const { transformer, resolver } = config;

// Lets `import Logo from './logo.svg'` work as a component (via
// react-native-svg), instead of resolving to a static image URI.
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

module.exports = config;
