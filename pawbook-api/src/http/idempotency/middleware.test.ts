import { describe, expect, test } from "bun:test";
import { OpenAPIHono, z } from "@hono/zod-openapi";
import { IdempotencyHeadersSchema, ProblemSchema } from "@pawbook/contracts";
import { createMiddleware } from "hono/factory";
import pino from "pino";
import { AppError } from "../../shared/errors";
import { clientIp } from "../middleware/client-ip";
import { handleError } from "../middleware/errors";
import { requestLogger } from "../middleware/request-logger";
import type { AppEnv } from "../types";
import { idempotency } from "./middleware";
import { type IdempotencyStore, MemoryIdempotencyStore } from "./store";

const silent = pino({ level: "silent" });
const KEY = "0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e61";

/**
 * App mínima con una ruta de creación idempotente. `X-Test-User` hace de auth y `X-Test-Status`
 * fuerza el estado de la respuesta. `gate` permite dejar una solicitud "en curso".
 */
function harness(options: { store?: IdempotencyStore; required?: boolean } = {}) {
  const store = options.store ?? new MemoryIdempotencyStore();
  let executions = 0;
  let gate: Promise<void> = Promise.resolve();

  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result) => {
      if (!result.success) throw new AppError("validation-failed");
    },
  });
  app.use(requestLogger(silent));
  app.use(clientIp({ trustedProxyHops: 0 }));
  app.use(
    createMiddleware<AppEnv>(async (c, next) => {
      const user = c.req.header("x-test-user");
      if (user !== undefined) c.set("userId", user);
      await next();
    }),
  );
  app.openapi(
    {
      method: "post",
      path: "/pets",
      middleware: [idempotency({ store, ...(options.required ? { required: true } : {}) })],
      request: {
        headers: IdempotencyHeadersSchema,
        body: { content: { "application/json": { schema: z.object({ name: z.string() }) } } },
      },
      responses: { 201: { description: "Creada" } },
    },
    async (c) => {
      executions += 1;
      await gate;
      const forced = Number(c.req.header("x-test-status") ?? 201);
      if (forced >= 500) throw new Error("fallo interno");
      if (forced === 409) throw new AppError("conflict");
      if (forced === 404) throw new AppError("not-found");
      const { name } = c.req.valid("json");
      c.header("Location", `/v1/pets/${executions}`);
      return c.json({ id: executions, name }, 201);
    },
  );
  app.onError(handleError);

  return {
    app,
    executions: () => executions,
    hold: () => {
      let release = () => {};
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return release;
    },
    post: (body: unknown, headers: Record<string, string> = {}) =>
      app.request("/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": KEY, ...headers },
        body: JSON.stringify(body),
      }),
  };
}

describe("Idempotency-Key", () => {
  test("misma key y mismo cuerpo: reproduce la respuesta sin repetir la operación", async () => {
    const h = harness();
    const first = await h.post({ name: "Luna" });
    expect(first.status).toBe(201);
    expect(first.headers.get("idempotent-replayed")).toBeNull();

    const second = await h.post({ name: "Luna" });
    expect(second.status).toBe(201);
    expect(second.headers.get("idempotent-replayed")).toBe("true");
    expect(second.headers.get("location")).toBe("/v1/pets/1");
    expect(second.headers.get("content-type")).toContain("application/json");
    expect(await second.json()).toEqual(await first.json());
    expect(h.executions()).toBe(1);
  });

  test("misma key y otro cuerpo: 422", async () => {
    const h = harness();
    await h.post({ name: "Luna" });
    const res = await h.post({ name: "Simba" });
    expect(res.status).toBe(422);
    expect(ProblemSchema.parse(await res.json()).detail).toContain("otros datos");
    expect(h.executions()).toBe(1);
  });

  test("misma key con la primera solicitud en curso: 409", async () => {
    const h = harness();
    const release = h.hold();
    const first = h.post({ name: "Luna" });
    // Espera a que la primera solicitud haya reservado la key y esté dentro de la ruta.
    while (h.executions() === 0) await Bun.sleep(1);
    const second = await h.post({ name: "Luna" });
    expect(second.status).toBe(409);
    release();
    expect((await first).status).toBe(201);
    expect(h.executions()).toBe(1);
  });

  test("la key se aísla por usuario", async () => {
    const h = harness();
    await h.post({ name: "Luna" }, { "X-Test-User": "ana" });
    const other = await h.post({ name: "Luna" }, { "X-Test-User": "bruno" });
    expect(other.headers.get("idempotent-replayed")).toBeNull();
    expect(h.executions()).toBe(2);
  });

  test("un 5xx no se guarda: el reintento vuelve a ejecutar la operación", async () => {
    const h = harness();
    expect((await h.post({ name: "Luna" }, { "X-Test-Status": "500" })).status).toBe(500);
    const retry = await h.post({ name: "Luna" });
    expect(retry.status).toBe(201);
    expect(retry.headers.get("idempotent-replayed")).toBeNull();
    expect(h.executions()).toBe(2);
  });

  test("un 4xx determinista se guarda y uno transitorio (409) no", async () => {
    const deterministic = harness();
    await deterministic.post({ name: "Luna" }, { "X-Test-Status": "404" });
    const replayed = await deterministic.post({ name: "Luna" });
    expect(replayed.status).toBe(404);
    expect(replayed.headers.get("idempotent-replayed")).toBe("true");

    const transient = harness();
    await transient.post({ name: "Luna" }, { "X-Test-Status": "409" });
    expect((await transient.post({ name: "Luna" })).status).toBe(201);
  });

  test("valida el formato y la longitud de la key", async () => {
    const h = harness();
    expect((await h.post({ name: "Luna" }, { "Idempotency-Key": "con espacios" })).status).toBe(
      400,
    );
    expect((await h.post({ name: "Luna" }, { "Idempotency-Key": "x".repeat(256) })).status).toBe(
      400,
    );
    expect((await h.post({ name: "Luna" }, { "Idempotency-Key": "x".repeat(255) })).status).toBe(
      201,
    );
  });

  test("sin key es opcional salvo que la ruta la exija", async () => {
    const send = (h: ReturnType<typeof harness>) =>
      h.app.request("/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Luna" }),
      });
    expect((await send(harness())).status).toBe(201);
    expect((await send(harness({ required: true }))).status).toBe(400);
  });

  test("si el almacén no responde: 503 sin ejecutar la operación", async () => {
    const broken: IdempotencyStore = {
      begin: async () => {
        throw new Error("ECONNREFUSED");
      },
      complete: async () => {},
      release: async () => {},
    };
    const h = harness({ store: broken });
    expect((await h.post({ name: "Luna" })).status).toBe(503);
    expect(h.executions()).toBe(0);
  });
});
