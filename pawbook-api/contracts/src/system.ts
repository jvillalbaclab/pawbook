import { z } from "@hono/zod-openapi";

export const HealthSchema = z
  .object({
    status: z.literal("ok"),
    version: z.string().openapi({ example: "0.1.0" }),
  })
  .openapi("Health");

export const ReadinessSchema = z
  .object({
    status: z.enum(["ok", "unavailable"]),
    checks: z
      .record(z.string(), z.enum(["ok", "fail"]))
      .openapi({ example: { postgres: "ok", valkey: "ok" } }),
  })
  .openapi("Readiness");

export type Health = z.infer<typeof HealthSchema>;
export type Readiness = z.infer<typeof ReadinessSchema>;
