import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@milsaca/ui",
    "@milsaca/db",
    "@milsaca/types",
    "@milsaca/config-tailwind",
  ],
  experimental: {
    typedRoutes: true,
  },
};

export default config;
