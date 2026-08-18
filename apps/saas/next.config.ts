import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile the shared workspace package (TS source), keep pg as a server-only
  // external (native module — must not be bundled).
  transpilePackages: ["@epictete/core"],
  serverExternalPackages: ["pg"],
};

export default nextConfig;
