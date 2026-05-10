const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add extensions for files that aren't JS/TS
config.resolver.assetExts.push(
  'pdf',
  'ttf',
  'otf',
  'wasm',
  'db',
  'sqlite',
  'mp4',
  'mp3'
);

module.exports = config;