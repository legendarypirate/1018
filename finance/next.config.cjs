/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "1018.teensclub.mn",
        "www.1018.teensclub.mn"
      ]
    }
  }
}

module.exports = nextConfig
