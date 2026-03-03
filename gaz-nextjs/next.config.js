/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false
  },
  output: "standalone",
  serverExternalPackages: ["tesseract.js"]
};

module.exports = nextConfig;
