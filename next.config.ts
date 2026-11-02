import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (cacheComponents / partialPrefetching) is off: on Cloudflare Workers (OpenNext) every page
  // hung with it on. The pages are still prerendered at build time.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // www.deepertones.com is served by the same Worker; send it to the bare domain.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.deepertones.com" }],
        destination: "https://deepertones.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
