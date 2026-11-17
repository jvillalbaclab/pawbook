import type { OpenAPIHono } from "@hono/zod-openapi";
import { IdempotencyKeySchema, ProblemSchema } from "@pawbook/contracts";
import { REPLAYED_HEADER } from "./idempotency/middleware";
import type { AppEnv } from "./types";

const integerHeader = (description: string) => ({
  description,
  schema: { type: "integer" as const, minimum: 0 },
});

/*
 * Componentes reutilizables del OpenAPI para las cabeceras transversales: las rutas los
 * referencian (`$ref`) en vez de repetirlos. Toda ruta bajo /v1 puede responder 429.
 */
export function registerSharedComponents(app: OpenAPIHono<AppEnv>) {
  const registry = app.openAPIRegistry;
  registry.register("Problem", ProblemSchema);
  const headers = {
    "RateLimit-Limit": integerHeader("Solicitudes permitidas en la ventana actual."),
    "RateLimit-Remaining": integerHeader("Solicitudes que quedan en la ventana actual."),
    "RateLimit-Reset": integerHeader("Segundos hasta que se reinicia la ventana."),
    "RateLimit-Policy": {
      description: "Política aplicada: `límite;w=ventana en segundos` (p. ej. `120;w=60`).",
      schema: { type: "string" as const, example: "120;w=60" },
    },
    "Retry-After": integerHeader("Segundos que hay que esperar antes de reintentar."),
    [REPLAYED_HEADER]: {
      description:
        "`true` si la respuesta se reproduce de una solicitud anterior con la misma Idempotency-Key.",
      schema: { type: "string" as const, enum: ["true"] },
    },
  };
  for (const [name, header] of Object.entries(headers)) {
    registry.registerComponent("headers", name, header);
  }

  registry.registerComponent("responses", "TooManyRequests", {
    description: "Límite de solicitudes superado (NFR-SEC-004).",
    headers: Object.fromEntries(
      [
        "Retry-After",
        "RateLimit-Limit",
        "RateLimit-Remaining",
        "RateLimit-Reset",
        "RateLimit-Policy",
      ].map((name) => [name, { $ref: `#/components/headers/${name}` }]),
    ),
    content: {
      "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } },
    },
  });

  registry.registerParameter(
    "IdempotencyKey",
    IdempotencyKeySchema.openapi({
      param: { name: "Idempotency-Key", in: "header", required: false },
    }),
  );
}
