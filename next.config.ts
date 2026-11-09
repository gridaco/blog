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
        // Support the legacy proxy, which strips /blog, and the new prefixed proxy.
        .flatMap(
          (asset) =>
            [
              {
                source: (asset as { legacyPath: string }).legacyPath.slice("/blog".length),
                destination: asset.path.slice("/blog".length),
                permanent: true,
              },
              {
                source: (asset as { legacyPath: string }).legacyPath.slice("/blog".length),
                destination: asset.path,
                basePath: false,
                permanent: true,
              },
            ] as const,
        ),
      { source: "/markdown-page", destination: "/", permanent: true },
      { source: "/markdown-page", destination: "/blog", basePath: false, permanent: true },
    ];
  },
};

export default config;
