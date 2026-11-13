import { describe, expect, test } from "bun:test";
import { z } from "@hono/zod-openapi";
import { ProblemSchema } from "@pawbook/contracts";
import pino from "pino";
import { AppError } from "../shared/errors";
import { isUuidV7 } from "../shared/ids";
import { createApp } from "./app";
import type { ReadinessCheck } from "./types";

const silent = pino({ level: "silent" });

function buildApp(readinessChecks: ReadinessCheck[] = []) {
  return createApp({
    logger: silent,
    version: "9.9.9",
    corsOrigins: ["http://localhost:3000"],
    readinessChecks,
  });
}

const passing = (name: string): ReadinessCheck => ({ name, check: async () => {} });
const failing = (name: string): ReadinessCheck => ({
  name,
  check: async () => {
    throw new Error("connection refused");
  },
});

describe("GET /v1/health", () => {
  test("responde ok con la versión", async () => {
    const res = await buildApp().request("/v1/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", version: "9.9.9" });
  });
});

describe("GET /v1/ready", () => {
  test("200 cuando todas las dependencias responden", async () => {
    const res = await buildApp([passing("postgres"), passing("valkey")]).request("/v1/ready");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", checks: { postgres: "ok", valkey: "ok" } });
  });

  test("503 e indica cuál falla, sin filtrar el mensaje interno", async () => {
    const res = await buildApp([passing("postgres"), failing("valkey")]).request("/v1/ready");
    expect(res.status).toBe(503);
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({
      status: "unavailable",
      checks: { postgres: "ok", valkey: "fail" },
    });
    expect(body).not.toContain("connection refused");
  });

  test("marca como fallida una dependencia que no responde a tiempo", async () => {
    const hanging: ReadinessCheck = { name: "postgres", check: () => new Promise(() => {}) };
    const startedAt = performance.now();
    const res = await buildApp([hanging]).request("/v1/ready");
    expect(res.status).toBe(503);
    expect(performance.now() - startedAt).toBeLessThan(3_000);
  });
});

describe("errores RFC 9457", () => {
  test("una ruta inexistente devuelve 404 problem+json", async () => {
    const res = await buildApp().request("/v1/no-existe");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    const problem = ProblemSchema.parse(await res.json());
    expect(problem).toMatchObject({
      type: "https://pawbook.app/problems/not-found",
      status: 404,
      instance: "/v1/no-existe",
    });
    expect(problem.requestId).toBe(res.headers.get("x-request-id") ?? "falta X-Request-Id");
  });

  test("un AppError lanzado en una ruta conserva su estado y detalle", async () => {
    const app = buildApp();
    app.get("/v1/test/conflict", () => {
      throw new AppError("conflict", { detail: "El @handle ya está en uso." });
    });
    const res = await app.request("/v1/test/conflict");
    expect(res.status).toBe(409);
    expect(ProblemSchema.parse(await res.json()).detail).toBe("El @handle ya está en uso.");
  });

  test("un error inesperado sale como 500 genérico", async () => {
    const app = buildApp();
    app.get("/v1/test/boom", () => {
      throw new Error("password=hunter2");
    });
    const res = await app.request("/v1/test/boom");
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("hunter2");
  });

  test("los fallos de validación devuelven 422 con errores por campo", async () => {
    const app = buildApp();
    app.openapi(
      {
        method: "post",
        path: "/v1/test/pets",
        request: {
          body: {
            content: { "application/json": { schema: z.object({ name: z.string().min(1) }) } },
          },
        },
        responses: { 204: { description: "ok" } },
      },
      (c) => c.body(null, 204),
    );
    const res = await app.request("/v1/test/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    expect(res.status).toBe(422);
    const problem = ProblemSchema.parse(await res.json());
    expect(problem.type).toBe("https://pawbook.app/problems/validation-failed");
    expect(problem.errors?.[0]?.path).toBe("name");
  });
});

describe("middlewares transversales", () => {
  test("genera un X-Request-Id UUIDv7 si el cliente no lo envía", async () => {
    const res = await buildApp().request("/v1/health");
    expect(isUuidV7(res.headers.get("x-request-id") ?? "")).toBe(true);
  });

  test("propaga el X-Request-Id entrante", async () => {
    const res = await buildApp().request("/v1/health", {
      headers: { "X-Request-Id": "web-abc-123" },
    });
    expect(res.headers.get("x-request-id")).toBe("web-abc-123");
  });

  test("envía cabeceras de seguridad", async () => {
    const res = await buildApp().request("/v1/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });

  test("CORS permite solo los orígenes configurados", async () => {
    const preflight = (origin: string) =>
      buildApp().request("/v1/health", {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "X-Pet-Id",
        },
      });

    const allowed = await preflight("http://localhost:3000");
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(allowed.headers.get("access-control-allow-headers")).toContain("X-Pet-Id");

    const denied = await preflight("https://evil.example");
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("GET /v1/openapi.json", () => {
  test("documenta los endpoints de sistema y el esquema Problem", async () => {
    const res = await buildApp().request("/v1/openapi.json");
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(doc.openapi).toBe("3.1.0");
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(["/v1/health", "/v1/ready"]));
  });
});
