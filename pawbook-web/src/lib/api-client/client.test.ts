import { describe, expect, test } from "bun:test";
import type { AuthSession } from "@pawbook/contracts";
import { createAuthFetch } from "./auth-fetch";
import { createApiClient, createRefreshRequest, unwrap } from "./client";
import { ApiError } from "./problem";
import { createSessionController } from "./session";

/*
 * Cliente de la API contra una "API" falsa en memoria: serialización del refresh con
 * solicitudes concurrentes, reintento tras 401 una sola vez y errores problem+json.
 */

const API = "https://api.pawbook.test";
const NOW = Date.parse("2026-11-17T10:00:00Z");

function authSession(token: string, emailVerified = false): AuthSession {
  return {
    tokenType: "Bearer",
    accessToken: token,
    expiresIn: 900,
    accessTokenExpiresAt: new Date(NOW + 900_000).toISOString(),
    refreshToken: null,
    refreshTokenExpiresAt: new Date(NOW + 30 * 86_400_000).toISOString(),
    user: {
      id: "0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e61",
      email: "ana@example.com",
      status: emailVerified ? "active" : "pending_verification",
      emailVerified,
      birthDate: "1995-04-23",
      createdAt: new Date(NOW).toISOString(),
      termsAcceptance: null,
    },
  };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const problem = (code: string, status: number, extra: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({ type: `https://pawbook.app/problems/${code}`, title: code, status, ...extra }),
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

/**
 * API falsa: `/v1/me` acepta solo el token vigente; `/v1/auth/refresh` rota el token y, como
 * la real, revoca la sesión si llega un refresh concurrente con el mismo token.
 */
function fakeApi(options: { refreshDelayMs?: number; refreshFails?: boolean } = {}) {
  let generation = 1;
  let refreshing = false;
  const calls: string[] = [];
  let revoked = false;
  const fetchImpl = async (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url);
    calls.push(`${request.method} ${pathname}`);
    if (pathname === "/v1/auth/refresh") {
      if (refreshing) revoked = true; // reutilización del refresh token
      refreshing = true;
      await new Promise((resolve) => setTimeout(resolve, options.refreshDelayMs ?? 5));
      refreshing = false;
      if (options.refreshFails || revoked) return problem("unauthorized", 401);
      generation += 1;
      return json(authSession(`token-${generation}`));
    }
    if (pathname === "/v1/me") {
      const expected = `Bearer token-${generation}`;
      return request.headers.get("Authorization") === expected
        ? json(authSession(`token-${generation}`).user)
        : problem("unauthorized", 401);
    }
    return problem("not-found", 404);
  };
  return { fetchImpl, calls, isRevoked: () => revoked };
}

function setup(options: Parameters<typeof fakeApi>[0] = {}) {
  const server = fakeApi(options);
  const users: (string | null)[] = [];
  const session = createSessionController({
    refreshRequest: createRefreshRequest(API, server.fetchImpl),
    now: () => NOW,
    onChange: (user) => users.push(user?.email ?? null),
  });
  const api = createApiClient({ baseUrl: API, session, fetch: server.fetchImpl });
  return { server, session, api, users };
}

describe("serialización del refresh", () => {
  test("varias solicitudes con el token caducado comparten un solo refresh", async () => {
    const { server, session, api } = setup({ refreshDelayMs: 20 });
    session.set(authSession("token-1"));
    // La API ya rotó: token-1 deja de valer y todas reciben 401 a la vez.
    server.fetchImpl(new Request(`${API}/v1/auth/refresh`, { method: "POST" }));
    await new Promise((resolve) => setTimeout(resolve, 30));

    const results = await Promise.all([1, 2, 3, 4].map(() => unwrap(api.GET("/v1/me"))));
    expect(results.map((me) => me.email)).toEqual(Array(4).fill("ana@example.com"));
    const refreshes = server.calls.filter((call) => call === "POST /v1/auth/refresh");
    expect(refreshes).toHaveLength(2); // el de preparación y uno solo del cliente
    expect(server.isRevoked()).toBe(false);
    expect(session.accessToken()).toBe("token-3");
  });

  test("refresh() concurrentes devuelven la misma promesa", async () => {
    const { server, session } = setup();
    const [a, b, c] = await Promise.all([session.refresh(), session.refresh(), session.refresh()]);
    expect([a, b, c]).toEqual(["token-2", "token-2", "token-2"]);
    expect(server.calls).toEqual(["POST /v1/auth/refresh"]);
  });

  test("el cerrojo entre pestañas envuelve cada refresh", async () => {
    const order: string[] = [];
    const session = createSessionController({
      refreshRequest: async () => {
        order.push("refresh");
        return authSession("token-2");
      },
      withLock: async (work) => {
        order.push("lock");
        const result = await work();
        order.push("unlock");
        return result;
      },
    });
    await Promise.all([session.refresh(), session.refresh()]);
    expect(order).toEqual(["lock", "refresh", "unlock"]);
  });

  test("tras un 401, si otra solicitud ya renovó, reintenta sin otro refresh", async () => {
    let refreshes = 0;
    const session = createSessionController({
      refreshRequest: async () => {
        refreshes += 1;
        return authSession("token-2");
      },
      now: () => NOW,
    });
    session.set(authSession("token-2"));
    expect(await session.renewAfterRejection("token-1")).toBe("token-2");
    expect(refreshes).toBe(0);
  });
});

describe("reintento tras 401", () => {
  test("repite la solicitud original una sola vez con el token nuevo", async () => {
    const seen: string[] = [];
    const authFetch = createAuthFetch(
      {
        ensureFreshToken: async () => "old",
        renewAfterRejection: async () => "new",
      },
      async (request) => {
        seen.push(`${request.headers.get("Authorization")} ${await request.text()}`);
        return request.headers.get("Authorization") === "Bearer new"
          ? json({ ok: true })
          : problem("unauthorized", 401);
      },
    );
    const response = await authFetch(
      new Request(`${API}/v1/pets`, { method: "POST", body: '{"name":"Luna"}' }),
    );
    expect(response.status).toBe(200);
    // El cuerpo llega completo también en el reintento.
    expect(seen).toEqual(['Bearer old {"name":"Luna"}', 'Bearer new {"name":"Luna"}']);
  });

  test("si el reintento también da 401, no hay un tercer intento", async () => {
    let attempts = 0;
    const authFetch = createAuthFetch(
      { ensureFreshToken: async () => "a", renewAfterRejection: async () => "b" },
      async () => {
        attempts += 1;
        return problem("unauthorized", 401);
      },
    );
    expect((await authFetch(new Request(`${API}/v1/me`))).status).toBe(401);
    expect(attempts).toBe(2);
  });

  test("si la sesión terminó, devuelve el 401 y queda sin sesión", async () => {
    const { session, api, users } = setup({ refreshFails: true });
    session.set(authSession("caducado"));
    await expect(unwrap(api.GET("/v1/me"))).rejects.toMatchObject({ code: "unauthorized" });
    expect(session.hasSession()).toBe(false);
    expect(users.at(-1)).toBeNull();
  });

  test("las rutas públicas de auth no llevan Bearer ni disparan refresh", async () => {
    const seen: (string | null)[] = [];
    let renewals = 0;
    const authFetch = createAuthFetch(
      {
        ensureFreshToken: async () => "token",
        renewAfterRejection: async () => {
          renewals += 1;
          return "otro";
        },
      },
      async (request) => {
        seen.push(request.headers.get("Authorization"));
        return problem("unauthorized", 401);
      },
    );
    await authFetch(new Request(`${API}/v1/auth/sign-in`, { method: "POST", body: "{}" }));
    expect(seen).toEqual([null]);
    expect(renewals).toBe(0);
  });

  test("el reenvío de verificación sí lleva Bearer (exige sesión)", async () => {
    const seen: (string | null)[] = [];
    const authFetch = createAuthFetch(
      { ensureFreshToken: async () => "token", renewAfterRejection: async () => null },
      async (request) => {
        seen.push(request.headers.get("Authorization"));
        return new Response(null, { status: 202 });
      },
    );
    await authFetch(new Request(`${API}/v1/auth/verify-email/resend`, { method: "POST" }));
    expect(seen).toEqual(["Bearer token"]);
  });

  test("renueva antes de enviar si el token está a punto de caducar", async () => {
    let now = NOW;
    const { server } = setup();
    const controller = createSessionController({
      refreshRequest: createRefreshRequest(API, server.fetchImpl),
      now: () => now,
    });
    controller.set(authSession("token-1"));
    now = NOW + 890_000; // a 10 s de caducar
    expect(await controller.ensureFreshToken()).toBe("token-2");
  });
});

describe("errores de la API", () => {
  test("un problem+json se convierte en ApiError con su código y errores por campo", async () => {
    const fetchImpl = async () =>
      problem("validation-failed", 422, {
        errors: [
          { path: "birthDate", message: "Edad mínima: 18 años" },
          { path: "birthDate", message: "otro" },
        ],
      });
    const client = createApiClient({
      baseUrl: API,
      session: createSessionController({ refreshRequest: async () => null }),
      fetch: fetchImpl,
    });
    const error = await unwrap(
      client.POST("/v1/auth/sign-up", {
        body: {
          email: "a@b.co",
          password: "x".repeat(10),
          birthDate: "2015-01-01",
          termsVersion: "2026-11-17",
        },
      }),
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: "validation-failed",
      fieldErrors: { birthDate: "Edad mínima: 18 años" },
    });
  });

  test("un fallo de red es un ApiError network-error", async () => {
    const client = createApiClient({
      baseUrl: API,
      session: createSessionController({ refreshRequest: async () => null }),
      fetch: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    await expect(unwrap(client.GET("/v1/me"))).rejects.toMatchObject({
      code: "network-error",
      status: 0,
    });
  });

  test("el refresh distingue 'sin sesión' (null) de un error (lanza)", async () => {
    expect(await createRefreshRequest(API, async () => problem("unauthorized", 401))()).toBeNull();
    await expect(
      createRefreshRequest(API, async () => problem("rate-limited", 429))(),
    ).rejects.toMatchObject({ code: "rate-limited" });
  });

  test("el refresh va con la cookie (credentials: include) y sin cuerpo", async () => {
    let captured: Request | undefined;
    await createRefreshRequest(API, async (request) => {
      captured = request;
      return json(authSession("t"));
    })();
    expect(captured?.credentials).toBe("include");
    expect(captured?.method).toBe("POST");
    expect(captured?.url).toBe(`${API}/v1/auth/refresh`);
  });
});
