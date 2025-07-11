// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for Redux Saga import issue in Expo SDK 53
// This disables the new package exports behavior that breaks redux-saga's default import
config.resolver.unstable_enablePackageExports = false;

module.exports = config;