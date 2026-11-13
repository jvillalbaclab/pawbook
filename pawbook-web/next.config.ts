import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Las carpetas que empiezan por "@" son slots de rutas paralelas en el App Router,
  // así que la URL pública /@handle se reescribe internamente a /mascota/handle.
  async rewrites() {
    return [{ source: "/@:handle", destination: "/mascota/:handle" }];
  },
};

export default nextConfig;
