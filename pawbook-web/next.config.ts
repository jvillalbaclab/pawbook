import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Conecta next-intl con su configuración por petición (catálogo y locale).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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

export default withNextIntl(nextConfig);
