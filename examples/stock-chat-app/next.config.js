/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['better-ui'],
  outputFileTracingRoot: require('path').join(__dirname, '../..'),
}

module.exports = nextConfig