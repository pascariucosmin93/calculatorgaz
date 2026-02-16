/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true
  },
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["tesseract.js"]
  }
};

module.exports = nextConfig;
