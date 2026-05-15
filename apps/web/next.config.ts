import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  transpilePackages: [
    "@milsaca/ui",
    "@milsaca/db",
    "@milsaca/types",
    "@milsaca/config-tailwind",
  ],
};

export default config;
