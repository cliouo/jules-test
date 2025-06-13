import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const targetServerUrl = process.env.TARGET_SERVER_URL;
    if (!targetServerUrl) {
      // In a local development environment, you might want to throw an error
      // or default to a specific URL, but for Vercel deployment,
      // the environment variable should be set.
      console.warn("TARGET_SERVER_URL environment variable is not set.");
      return []; // Return no rewrites if the URL isn't set
    }
    return [
      {
        source: "/:path*",
        destination: `${targetServerUrl}/:path*`,
      },
    ];
  },
  /* other config options if any */
};

export default nextConfig;
