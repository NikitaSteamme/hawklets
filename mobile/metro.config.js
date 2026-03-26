const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for axios crypto module issue in React Native
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    // Redirect Node.js specific modules to empty shims
    crypto: require.resolve('react-native-crypto'),
    stream: require.resolve('readable-stream'),
    vm: require.resolve('vm-browserify'),
  },
  // Force Metro to resolve to the browser field in package.json
  resolverMainFields: ['react-native', 'browser', 'main'],
  // Block Node.js specific files from being bundled
  blockList: [
    /node_modules\/axios\/dist\/node\/axios\.cjs$/,
    /node_modules\/axios\/lib\/adapters\/http\.js$/,
  ],
};

// Enable symlinks for better module resolution
config.resolver.disableHierarchicalLookup = false;
config.watchFolders = [__dirname];

module.exports = config;