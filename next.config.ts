import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add this block:
  serverExternalPackages: ["sqlite3", "sqlite"],
};

export default nextConfig;