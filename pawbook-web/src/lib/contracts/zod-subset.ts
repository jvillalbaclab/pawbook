/*
 * Las piezas de Zod que usan los esquemas de @pawbook/contracts, exportadas por nombre.
 * El sustituto de `@hono/zod-openapi` las agrupa como `z` (export * as z): así el bundler
 * solo incluye estas funciones y no el espacio de nombres entero de Zod, que arrastra las
 * traducciones de errores a todos los idiomas (~90 KB comprimidos que la web no usa: los
 * mensajes salen del catálogo).
 *
 * Si un esquema del contrato usa una función nueva (`z.algo`), el typecheck de la web falla
 * aquí: basta con añadirla a la lista.
 */

export type { infer, input, output } from "zod";
export {
  array,
  boolean,
  coerce,
  discriminatedUnion,
  email,
  enum,
  int,
  iso,
  literal,
  nullable,
  number,
  object,
  optional,
  record,
  string,
  union,
  url,
  uuid,
  ZodType,
} from "zod";
