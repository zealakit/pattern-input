import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// While the engine is consumed through `link:` (D23) it lives beside this repo, and Turbopack only
// follows files under its root. Remove this once the engine comes from the registry.
const workspaceRoot = fileURLToPath(new URL("../../..", import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(workspaceRoot) },
  transpilePackages: ["@zealakit/pattern-input-react"],
};

export default nextConfig;
