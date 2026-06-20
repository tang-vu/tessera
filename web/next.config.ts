import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tessera/agent"],
  // @irys/* are optional runtime deps (dynamic-imported only when IRYS_PRIVATE_KEY is set);
  // mark them external so the build never tries to bundle/resolve them. @google/genai is server-only.
  serverExternalPackages: ["viem", "@google/genai", "@irys/upload", "@irys/upload-ethereum"],
};

export default nextConfig;
