import { z } from "@hono/zod-openapi";

/**
 * Valor de la cabecera `Idempotency-Key` (NFR-REL-001): entre 1 y 255 caracteres ASCII
 * visibles, sin espacios. Se recomienda un UUID generado por el cliente para cada operación
 * y reutilizado solo en sus reintentos.
 */
export const IdempotencyKeySchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[\x21-\x7e]+$/, "Solo caracteres ASCII visibles, sin espacios")
  .openapi({
    description:
      "Clave única por operación. Reintentar con la misma clave y el mismo cuerpo devuelve la respuesta original sin repetir la operación.",
    example: "0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e61",
  });

/** Cabeceras de solicitud de un `POST` de creación idempotente. */
export const IdempotencyHeadersSchema = z.object({
  "idempotency-key": IdempotencyKeySchema.optional(),
});
