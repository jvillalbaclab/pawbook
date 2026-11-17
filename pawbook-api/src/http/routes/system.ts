import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { HealthSchema, ReadinessSchema } from "@pawbook/contracts";
import { withTimeout } from "../../shared/timeout";
import type { AppEnv, ReadinessCheck } from "../types";

const CHECK_TIMEOUT_MS = 2_000;

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["Sistema"],
  summary: "Liveness: el proceso está vivo",
  responses: {
    200: {
      description: "Proceso activo",
      content: { "application/json": { schema: HealthSchema } },
    },
  },
});

const readyRoute = createRoute({
  method: "get",
  path: "/ready",
  tags: ["Sistema"],
  summary: "Readiness: las dependencias responden y la instancia puede recibir tráfico",
  responses: {
    200: { description: "Lista", content: { "application/json": { schema: ReadinessSchema } } },
    503: {
      description: "Alguna dependencia no responde",
      content: { "application/json": { schema: ReadinessSchema } },
    },
  },
});

export function systemRoutes(options: { version: string; checks: readonly ReadinessCheck[] }) {
  return new OpenAPIHono<AppEnv>()
    .openapi(healthRoute, (c) => c.json({ status: "ok" as const, version: options.version }, 200))
    .openapi(readyRoute, async (c) => {
      // Las comprobaciones corren en paralelo: /ready tarda lo que la más lenta, no la suma.
      const results = await Promise.allSettled(
        options.checks.map((dependency) => withTimeout(dependency.check(), CHECK_TIMEOUT_MS)),
      );
      const checks: Record<string, "ok" | "fail"> = {};
      results.forEach((result, index) => {
        const name = options.checks[index]?.name ?? `check-${index}`;
        checks[name] = result.status === "fulfilled" ? "ok" : "fail";
        if (result.status === "rejected") {
          c.get("logger").warn({ dependency: name, err: result.reason }, "readiness check failed");
        }
      });
      const healthy = results.every((result) => result.status === "fulfilled");
      return healthy
        ? c.json({ status: "ok" as const, checks }, 200)
        : c.json({ status: "unavailable" as const, checks }, 503);
    });
}
