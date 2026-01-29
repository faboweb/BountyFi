const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure expo-web-browser resolves for @coinbase/cdp-core (avoids pnpm variant
// resolution issues when code runs from nested .pnpm paths).
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.extraNodeModules = {
  'expo-web-browser': path.resolve(projectRoot, 'node_modules/expo-web-browser'),
};

module.exports = config;
