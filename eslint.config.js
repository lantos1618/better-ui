const { FlatCompat } = require('@eslint/eslintrc');
const path = require('path');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

module.exports = [
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', '*.config.js'],
  },
  ...compat.extends('next/core-web-vitals'),
];
