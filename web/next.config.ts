import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tessera/agent"],
  serverExternalPackages: ["viem"],
};

export default nextConfig;
