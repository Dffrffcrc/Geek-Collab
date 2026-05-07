const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

// Resolve the actual project root (handle symlinks)
const projectRoot = fs.realpathSync(__dirname);

const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];

// Configure transformer to handle URL-encoded paths with spaces
config.transformer = {
  ...config.transformer,
  allowOptionalDependencies: true,
  // Ensure async is true to prevent old transform issues
  asyncRequireModulePath: require.resolve('metro-runtime/src/modules/asyncRequire'),
};

module.exports = config;
