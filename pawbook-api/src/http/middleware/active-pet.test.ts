import { describe, expect, test } from "bun:test";
import { ProblemSchema } from "@pawbook/contracts";
import pino from "pino";
import { createApp } from "../app";
import { MemoryIdempotencyStore } from "../idempotency/store";
import { MemoryRateLimitStore } from "../rate-limit/store";
import { activePetOf, createActivePetMiddleware } from "./active-pet";
import type { AccessTokenVerifier } from "./auth";

const OWN_PET = "0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e61";
const OTHER_PET = "0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e62";

/** `Bearer user-<n>` autentica al usuario `<n>`. */
const tokens: AccessTokenVerifier = {
  verify: async (token) =>
    token.startsWith("user-")
      ? { userId: token.slice(5), sessionId: "s", emailVerified: true }
      : null,
};

function buildApp() {
  const checked: string[] = [];
  const activePet = createActivePetMiddleware({
    canActAs: async (userId, petId) => {
      checked.push(petId);
      return userId === "1" && petId === OWN_PET;
    },
  });
  const app = createApp({
    logger: pino({ level: "silent" }),
    version: "test",
    corsOrigins: [],
    readinessChecks: [],
    trustedProxyHops: 0,
    rateLimitStore: new MemoryRateLimitStore(),
    idempotencyStore: new MemoryIdempotencyStore(),
    accessTokenVerifier: tokens,
  });
  app.post("/v1/test/act", activePet, (c) => c.json({ petId: activePetOf(c) }));
  return { app, checked };
}

const call = (app: ReturnType<typeof buildApp>["app"], headers: Record<string, string>) =>
  app.request("/v1/test/act", { method: "POST", headers });

describe("activePet", () => {
  test("deja en el contexto la mascota del usuario (normalizada a minúsculas)", async () => {
    const { app } = buildApp();
    const res = await call(app, {
      Authorization: "Bearer user-1",
      "X-Pet-Id": OWN_PET.toUpperCase(),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ petId: OWN_PET });
  });

  test("sin sesión responde 401 antes de mirar la cabecera", async () => {
    const { app, checked } = buildApp();
    const res = await call(app, { "X-Pet-Id": OWN_PET });
    expect(res.status).toBe(401);
    expect(checked).toEqual([]);
  });

  test("sin cabecera o con un ID mal formado responde 400", async () => {
    const { app, checked } = buildApp();
    expect((await call(app, { Authorization: "Bearer user-1" })).status).toBe(400);
    const bad = await call(app, { Authorization: "Bearer user-1", "X-Pet-Id": "luna" });
    expect(bad.status).toBe(400);
    expect(ProblemSchema.parse(await bad.json()).detail).toContain("X-Pet-Id");
    expect(checked).toEqual([]);
  });

  test("mascota ajena o inexistente: el mismo 403 en ambos casos", async () => {
    const { app } = buildApp();
    const foreign = await call(app, { Authorization: "Bearer user-2", "X-Pet-Id": OWN_PET });
    const missing = await call(app, { Authorization: "Bearer user-1", "X-Pet-Id": OTHER_PET });
    expect(foreign.status).toBe(403);
    expect(missing.status).toBe(403);
    const foreignProblem = ProblemSchema.parse(await foreign.json());
    expect(foreignProblem.detail).toBe(ProblemSchema.parse(await missing.json()).detail);
  });
});
