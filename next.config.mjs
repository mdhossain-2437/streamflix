/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "archive.org" },
      { protocol: "https", hostname: "ia.media-imdb.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.media.imdb.com" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs", "@neondatabase/serverless"],
  },
  webpack: (config) => {
    config.externals.push({ "node-gyp-build": "commonjs node-gyp-build" });
    return config;
  },
};

export default nextConfig;
