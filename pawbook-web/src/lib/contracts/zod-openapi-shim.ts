import type { core } from "zod";
import { ZodType } from "./zod-subset";

/*
 * Sustituto de `@hono/zod-openapi` para el navegador. Los esquemas de `@pawbook/contracts`
 * importan `z` de `@hono/zod-openapi` porque la API los usa también para generar el OpenAPI
 * con `.openapi(...)`. En la web solo hacen falta para validar: este módulo da un `z` con las
 * funciones de Zod que usa el contrato (zod-subset.ts) y un `.openapi()` que no hace nada, y
 * evita meter en el bundle Hono, el generador de OpenAPI y las traducciones de Zod (ver
 * `turbopack.resolveAlias` en next.config.ts, `paths` en tsconfig.json y test/contracts-alias.ts).
 */

declare module "zod" {
  interface ZodType<
    out Output = unknown,
    out Input = unknown,
    out Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<
      Output,
      Input
    >,
  > extends core.$ZodType<Output, Input, Internals> {
    /** Metadatos de OpenAPI: en la web se ignoran. */
    openapi(...metadata: unknown[]): this;
  }
}

// Zod copia a cada esquema las propiedades enumerables del prototipo de ZodType (así lo
// extiende también @asteasolutions/zod-to-openapi): una asignación normal, no defineProperty.
if (!("openapi" in ZodType.prototype)) {
  ZodType.prototype.openapi = function openapi(this: ZodType) {
    return this;
  };
}

export * as z from "./zod-subset";
