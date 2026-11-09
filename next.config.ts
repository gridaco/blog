import type { NextConfig } from "next";
import manifest from "./migration-manifest.json";

const config: NextConfig = {
  basePath: "/blog",
  poweredByHeader: false,
  images: { unoptimized: true },
  async redirects() {
    return [
      ...manifest.assets
        .filter((asset) => "legacyPath" in asset)
        .map((asset) => ({
          source: (asset as { legacyPath: string }).legacyPath.slice("/blog".length),
          destination: asset.path.slice("/blog".length),
          permanent: true,
        })),
      { source: "/markdown-page", destination: "/", permanent: true },
    ];
  },
};

export default config;
