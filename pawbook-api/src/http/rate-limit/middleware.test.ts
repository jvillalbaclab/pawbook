import { describe, expect, test } from "bun:test";
import { ProblemSchema } from "@pawbook/contracts";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import pino from "pino";
import { fixedClock } from "../../shared/clock";
import { createApp } from "../app";
import { MemoryIdempotencyStore } from "../idempotency/store";
import { clientIp, pickForwardedIp } from "../middleware/client-ip";
import { handleError } from "../middleware/errors";
import { requestLogger } from "../middleware/request-logger";
import type { AppEnv } from "../types";
import { type RateLimitOptions, rateLimit } from "./middleware";
import { MemoryRateLimitStore, type RateLimitStore } from "./store";

const silent = pino({ level: "silent" });

/** Simula el `env` de Bun.serve para fijar la IP de la conexión. */
const fromIp = (address: string) => ({ requestIP: () => ({ address }) });

/**
 * App mínima con la misma cadena que la real (requestLogger → clientIp → [auth] → rateLimit).
 * La cabecera `X-Test-User` hace de middleware de auth.
 */
function harness(
  options: Partial<RateLimitOptions> & { trustedProxyHops?: number; logger?: pino.Logger } = {},
) {
  const { trustedProxyHops = 0, logger = silent, ...limitOptions } = options;
  const app = new Hono<AppEnv>();
  app.use(requestLogger(logger));
  app.use(clientIp({ trustedProxyHops }));
  app.use(
    createMiddleware<AppEnv>(async (c, next) => {
      const user = c.req.header("x-test-user");
      if (user !== undefined) c.set("userId", user);
      await next();
    }),
  );
  app.use(
    rateLimit({
      name: "test",
      limit: 2,
      windowMs: 60_000,
      store: new MemoryRateLimitStore(),
      ...limitOptions,
    }),
  );
  app.get("/ping", (c) => c.text(c.get("clientIp")));
  app.onError(handleError);
  return app;
}

describe("rate limit en /v1", () => {
  function buildApp() {
    const app = createApp({
      logger: silent,
      version: "9.9.9",
      corsOrigins: ["http://localhost:3000"],
      readinessChecks: [],
      trustedProxyHops: 0,
      rateLimitStore: new MemoryRateLimitStore(),
      idempotencyStore: new MemoryIdempotencyStore(),
      globalRateLimit: { name: "default", limit: 2, windowMs: 60_000 },
    });
    app.get("/v1/test/ping", (c) => c.text("pong"));
    return app;
  }

  test("informa de la cuota con cabeceras RateLimit-*", async () => {
    const res = await buildApp().request("/v1/test/ping", {}, fromIp("10.0.0.1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("ratelimit-limit")).toBe("2");
    expect(res.headers.get("ratelimit-remaining")).toBe("1");
    expect(res.headers.get("ratelimit-reset")).toBe("60");
    expect(res.headers.get("ratelimit-policy")).toBe("2;w=60");
  });

  test("al superar el límite responde 429 problem+json con Retry-After", async () => {
    const app = buildApp();
    for (let i = 0; i < 2; i++) await app.request("/v1/test/ping", {}, fromIp("10.0.0.1"));
    const res = await app.request(
      "/v1/test/ping",
      { headers: { Origin: "http://localhost:3000" } },
      fromIp("10.0.0.1"),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(res.headers.get("retry-after")).toBe("60");
    expect(res.headers.get("ratelimit-remaining")).toBe("0");
    // El navegador solo puede leer estas cabeceras si CORS las expone.
    expect(res.headers.get("access-control-expose-headers")).toContain("Retry-After");
    expect(res.headers.get("access-control-expose-headers")).toContain("RateLimit-Remaining");
    const problem = ProblemSchema.parse(await res.json());
    expect(problem.type).toBe("https://pawbook.app/problems/rate-limited");
    expect(problem.requestId).toBe(res.headers.get("x-request-id") ?? "falta X-Request-Id");
  });

  test("las sondas de salud no consumen cuota ni reciben 429", async () => {
    const app = buildApp();
    for (let i = 0; i < 5; i++) {
      const res = await app.request("/v1/health", {}, fromIp("10.0.0.1"));
      expect(res.status).toBe(200);
      expect(res.headers.get("ratelimit-limit")).toBeNull();
    }
    expect((await app.request("/v1/test/ping", {}, fromIp("10.0.0.1"))).status).toBe(200);
  });

  test("documenta la respuesta 429 y sus cabeceras en el OpenAPI", async () => {
    const res = await buildApp().request("/v1/openapi.json");
    const doc = (await res.json()) as {
      components: { responses: Record<string, unknown>; headers: Record<string, unknown> };
    };
    expect(doc.components.responses).toHaveProperty("TooManyRequests");
    expect(Object.keys(doc.components.headers)).toEqual(
      expect.arrayContaining(["Retry-After", "RateLimit-Limit", "RateLimit-Remaining"]),
    );
  });
});

describe("clave del contador", () => {
  test("anónimos: cada IP tiene su propia cuota", async () => {
    const app = harness();
    for (let i = 0; i < 2; i++) await app.request("/ping", {}, fromIp("10.0.0.1"));
    expect((await app.request("/ping", {}, fromIp("10.0.0.1"))).status).toBe(429);
    expect((await app.request("/ping", {}, fromIp("10.0.0.2"))).status).toBe(200);
  });

  test("autenticados: la cuota es del usuario, no de la IP compartida", async () => {
    const app = harness();
    const asUser = (user: string, ip: string) =>
      app.request("/ping", { headers: { "X-Test-User": user } }, fromIp(ip));
    await asUser("ana", "10.0.0.1");
    await asUser("ana", "10.0.0.2");
    // Ana agotó su cuota aunque cambie de IP...
    expect((await asUser("ana", "10.0.0.3")).status).toBe(429);
    // ...y Bruno, detrás de la misma IP, no se ve afectado.
    expect((await asUser("bruno", "10.0.0.1")).status).toBe(200);
    // Un anónimo en esa IP tampoco: la cuota por IP es otro contador.
    expect((await app.request("/ping", {}, fromIp("10.0.0.1"))).status).toBe(200);
  });

  test("la ventana se reinicia al caducar", async () => {
    const clock = fixedClock(new Date("2026-01-01T00:00:00Z"));
    const app = harness({ store: new MemoryRateLimitStore(clock) });
    for (let i = 0; i < 2; i++) await app.request("/ping", {}, fromIp("10.0.0.1"));
    const limited = await app.request("/ping", {}, fromIp("10.0.0.1"));
    expect(limited.status).toBe(429);
    clock.advance(30_000);
    expect((await app.request("/ping", {}, fromIp("10.0.0.1"))).headers.get("retry-after")).toBe(
      "30",
    );
    clock.advance(30_000);
    expect((await app.request("/ping", {}, fromIp("10.0.0.1"))).status).toBe(200);
  });
});

describe("IP del cliente", () => {
  test("por defecto ignora X-Forwarded-For (falsificable)", async () => {
    const app = harness();
    const res = await app.request(
      "/ping",
      { headers: { "X-Forwarded-For": "1.2.3.4" } },
      fromIp("10.0.0.1"),
    );
    expect(await res.text()).toBe("10.0.0.1");
  });

  test("con proxies de confianza toma la IP que añadió el último proxy", async () => {
    const app = harness({ trustedProxyHops: 1 });
    const res = await app.request(
      "/ping",
      { headers: { "X-Forwarded-For": "6.6.6.6, 203.0.113.7" } },
      fromIp("10.0.0.254"),
    );
    expect(await res.text()).toBe("203.0.113.7");
  });

  test("lee la IP del socket en @hono/node-server", async () => {
    const res = await harness().request(
      "/ping",
      {},
      {
        incoming: { socket: { remoteAddress: "192.0.2.9" } },
      },
    );
    expect(await res.text()).toBe("192.0.2.9");
  });

  test("pickForwardedIp cuenta los saltos desde la derecha", () => {
    expect(pickForwardedIp("a, b, c", 1)).toBe("c");
    expect(pickForwardedIp("a, b, c", 2)).toBe("b");
    expect(pickForwardedIp("a", 2)).toBeUndefined();
  });
});

describe("si Valkey no responde", () => {
  const broken: RateLimitStore = {
    hit: async () => {
      throw new Error("ECONNREFUSED");
    },
  };

  test("fail-open por defecto: deja pasar y lo registra", async () => {
    const lines: string[] = [];
    const logger = pino({ level: "warn" }, { write: (line: string) => lines.push(line) });
    const res = await harness({ store: broken, logger }).request("/ping", {}, fromIp("10.0.0.1"));
    expect(res.status).toBe(200);
    expect(lines.some((line) => line.includes("rate limit store unavailable"))).toBe(true);
  });

  test("fail-closed responde 503", async () => {
    const res = await harness({ store: broken, failClosed: true }).request("/ping");
    expect(res.status).toBe(503);
  });

  test("un Valkey colgado no bloquea la solicitud", async () => {
    const hanging: RateLimitStore = { hit: () => new Promise(() => {}) };
    const startedAt = performance.now();
    const res = await harness({ store: hanging }).request("/ping");
    expect(res.status).toBe(200);
    expect(performance.now() - startedAt).toBeLessThan(2_000);
  });
});
