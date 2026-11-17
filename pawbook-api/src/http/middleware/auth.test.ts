import { describe, expect, test } from "bun:test";
import { ProblemSchema } from "@pawbook/contracts";
import pino from "pino";
import { createApp } from "../app";
import { MemoryIdempotencyStore } from "../idempotency/store";
import { MemoryRateLimitStore } from "../rate-limit/store";
import { type AccessTokenVerifier, requireAuth, requireVerifiedEmail } from "./auth";

const silent = pino({ level: "silent" });

/** Tokens de prueba: `verified-<id>` y `pending-<id>`; cualquier otro es inválido. */
const verifier: AccessTokenVerifier = {
  verify: async (token) => {
    const [kind, id] = token.split("-");
    if (id === undefined || (kind !== "verified" && kind !== "pending")) return null;
    return { userId: `user-${id}`, sessionId: `session-${id}`, emailVerified: kind === "verified" };
  },
};

function buildApp() {
  const app = createApp({
    logger: silent,
    version: "9.9.9",
    corsOrigins: [],
    readinessChecks: [],
    trustedProxyHops: 1,
    rateLimitStore: new MemoryRateLimitStore(),
    idempotencyStore: new MemoryIdempotencyStore(),
    accessTokenVerifier: verifier,
    globalRateLimit: { name: "default", limit: 2, windowMs: 60_000 },
  });
  app.get("/v1/test/whoami", (c) => c.json({ userId: c.get("userId") ?? null }));
  app.get("/v1/test/private", requireAuth, (c) => c.text("ok"));
  app.post("/v1/test/posts", requireVerifiedEmail, (c) => c.text("publicado", 201));
  return app;
}

const as = (token: string, ip = "10.0.0.1") => ({
  headers: { Authorization: `Bearer ${token}`, "X-Forwarded-For": ip },
});

describe("authenticate", () => {
  test("sin Authorization la solicitud sigue como anónima", async () => {
    const res = await buildApp().request("/v1/test/whoami");
    expect(await res.json()).toEqual({ userId: null });
  });

  test("un Bearer válido deja el usuario en el contexto", async () => {
    const res = await buildApp().request("/v1/test/whoami", as("verified-1"));
    expect(await res.json()).toEqual({ userId: "user-1" });
  });

  test("un Bearer inválido responde 401 con WWW-Authenticate", async () => {
    const res = await buildApp().request("/v1/test/whoami", as("basura"));
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Bearer");
    expect(ProblemSchema.parse(await res.json()).type).toBe(
      "https://pawbook.app/problems/unauthorized",
    );
  });

  test("con sesión, el rate limit global cuenta por usuario y no por IP", async () => {
    const app = buildApp();
    // Dos usuarios detrás de la misma IP: cada uno tiene su propia cuota de 2.
    for (const token of ["verified-1", "verified-1", "verified-2", "verified-2"]) {
      expect((await app.request("/v1/test/whoami", as(token))).status).toBe(200);
    }
    expect((await app.request("/v1/test/whoami", as("verified-1"))).status).toBe(429);
  });

  test("los tokens inválidos cuentan contra el límite de la IP", async () => {
    const app = buildApp();
    expect((await app.request("/v1/test/whoami", as("basura", "10.9.9.9"))).status).toBe(401);
    expect((await app.request("/v1/test/whoami", as("basura", "10.9.9.9"))).status).toBe(401);
    expect((await app.request("/v1/test/whoami", as("basura", "10.9.9.9"))).status).toBe(429);
  });
});

describe("requireAuth y requireVerifiedEmail", () => {
  test("requireAuth responde 401 sin sesión", async () => {
    const res = await buildApp().request("/v1/test/private");
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Bearer");
  });

  test("requireVerifiedEmail responde 403 email-not-verified a una cuenta pendiente", async () => {
    const res = await buildApp().request("/v1/test/posts", { method: "POST", ...as("pending-1") });
    expect(res.status).toBe(403);
    expect(ProblemSchema.parse(await res.json()).type).toBe(
      "https://pawbook.app/problems/email-not-verified",
    );
  });

  test("requireVerifiedEmail deja pasar a una cuenta verificada y exige sesión", async () => {
    const app = buildApp();
    const ok = await app.request("/v1/test/posts", { method: "POST", ...as("verified-1") });
    expect(ok.status).toBe(201);
    expect((await app.request("/v1/test/posts", { method: "POST" })).status).toBe(401);
  });
});
