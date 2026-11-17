import { readFileSync } from "node:fs";
import { join } from "node:path";
import { plugin } from "bun";

/*
 * Precarga de `bun test` (bunfig.toml). Los archivos de `../pawbook-api/contracts` se
 * resuelven con el tsconfig de la API, que no conoce los alias de la web, y los plugins de
 * Bun en tiempo de ejecución no reescriben especificadores sin ruta. Así que al cargar cada
 * archivo del contrato se cambia `@hono/zod-openapi` por el mismo sustituto que usa el build
 * (next.config.ts): los tests prueban lo que llega al navegador y no necesitan instalar las
 * dependencias de la API.
 */
const SHIM = join(import.meta.dir, "../src/lib/contracts/zod-openapi-shim.ts").replaceAll(
  "\\",
  "/",
);

plugin({
  name: "pawbook-contracts-alias",
  setup(build) {
    build.onLoad({ filter: /pawbook-api[\\/]contracts[\\/]src[\\/].*\.ts$/ }, ({ path }) => ({
      contents: readFileSync(path, "utf8").replaceAll('"@hono/zod-openapi"', JSON.stringify(SHIM)),
      loader: "ts",
    }));
  },
});
