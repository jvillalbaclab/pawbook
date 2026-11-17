import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Conecta next-intl con su configuración por petición (catálogo y locale).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/*
 * Monorepo: el contrato (`@pawbook/contracts`) vive en ../pawbook-api/contracts y se consume
 * como código fuente, sin paquete publicado ni copia en node_modules. Turbopack solo resuelve
 * archivos dentro de su raíz, así que la raíz es la carpeta del monorepo.
 */
const MONOREPO_ROOT = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingRoot: MONOREPO_ROOT,
  turbopack: {
    root: MONOREPO_ROOT,
    resolveAlias: {
      "@pawbook/contracts": "../pawbook-api/contracts/src/index.ts",
      // En el navegador, `.openapi()` no hace nada: evita Hono y el generador de OpenAPI.
      "@hono/zod-openapi": "./src/lib/contracts/zod-openapi-shim.ts",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Las carpetas que empiezan por "@" son slots de rutas paralelas en el App Router,
  // así que la URL pública /@handle se reescribe internamente a /mascota/handle.
  // El service worker nunca se cachea en HTTP: así una versión nueva llega al recargar.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  async rewrites() {
    return [{ source: "/@:handle", destination: "/mascota/:handle" }];
  },
};

export default withNextIntl(nextConfig);
