import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: false, // Set to true for a permanent redirect (301)
      },
    ];
  },
};

export default nextConfig;
