import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";
import {
  AuthSessionSchema,
  GoogleSignInResponseSchema,
  MeSchema,
  ProblemSchema,
  SessionPageSchema,
} from "@pawbook/contracts";
import Redis from "ioredis";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import pino from "pino";
import { loadConfig } from "../src/composition/config";
import { createIdentityModule } from "../src/composition/identity";
import { createApp } from "../src/http/app";
import { ValkeyIdempotencyStore } from "../src/http/idempotency/valkey-store";
import { requireVerifiedEmail } from "../src/http/middleware/auth";
import { ValkeyRateLimitStore } from "../src/http/rate-limit/valkey-store";
import { DrizzleUnitOfWork } from "../src/infrastructure/db/database";
import { DrizzleEventOutbox } from "../src/infrastructure/db/outbox";
import { MemoryEmailSender } from "../src/infrastructure/email/email-senders";
import type { GoogleIdTokenVerifier } from "../src/modules/identity/application/ports";
import { JoseGoogleIdTokenVerifier } from "../src/modules/identity/infrastructure/google-id-token-verifier";
import { StaticBreachedPasswordChecker } from "../src/modules/identity/infrastructure/hibp-breached-password-checker";
import { setupTestDatabase, type TestDatabase } from "./support/database";

/*
 * Integración de identity contra el Postgres y el Valkey locales (`bun run db:up`): BD propia
 * `pawbook_test_identity` y claves Valkey con prefijo `test:identity:`. Lo que saldría a la red
 * (correo, Google, HIBP) se sustituye: correo en memoria, JWKS de Google local y lista fija.
 */
const PREFIX = "test:identity:";
const TERMS_VERSION = "2026-11-17";
const UNIFORM_MS = 150;
const GOOGLE_CLIENT_ID = "pawbook-web.apps.googleusercontent.com";
const PASSWORD = "una frase larga y propia";

// Cada flujo hace varios hashes Argon2id reales y viajes a Postgres: 5 s se queda corto.
setDefaultTimeout(30_000);

let database: TestDatabase;
const redis = new Redis(process.env.VALKEY_URL ?? "redis://localhost:6380", {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});
const mail = new MemoryEmailSender();

const googleKeys = await generateKeyPair("RS256");
const googleJwks = createLocalJWKSet({
  keys: [{ ...(await exportJWK(googleKeys.publicKey)), kid: "g1", alg: "RS256" }],
});

function googleIdToken(claims: { sub: string; email: string; email_verified?: boolean }) {
  return new SignJWT({ email: claims.email, email_verified: claims.email_verified ?? true })
    .setProtectedHeader({ alg: "RS256", kid: "g1" })
    .setSubject(claims.sub)
    .setIssuer("https://accounts.google.com")
    .setAudience(GOOGLE_CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(googleKeys.privateKey);
}

async function deleteTestKeys() {
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", `${PREFIX}*`, "COUNT", 500);
    if (keys.length > 0) await redis.del(...keys);
    cursor = next;
  } while (cursor !== "0");
}

function buildApp(options: { google?: GoogleIdTokenVerifier | null } = {}) {
  const config = loadConfig({
    DATABASE_URL: database.url,
    VALKEY_URL: process.env.VALKEY_URL ?? "redis://localhost:6380",
    AUTH_ACCESS_TOKEN_SECRET: "secreto-de-tests-de-integracion-con-32-caracteres",
    MIN_SIGNUP_AGE: "18",
    TERMS_VERSION,
    WEB_APP_URL: "https://pawbook.test",
    EMAIL_TRANSPORT: "memory",
    PASSWORD_BREACH_CHECK: "off",
  });
  const logger = pino({ level: "silent" });
  const unitOfWork = new DrizzleUnitOfWork(database.db);
  const rateLimitStore = new ValkeyRateLimitStore(redis, `${PREFIX}rl:`);
  const idempotencyStore = new ValkeyIdempotencyStore(redis, `${PREFIX}idem:`);
  const identity = createIdentityModule({
    config,
    logger,
    unitOfWork,
    outbox: new DrizzleEventOutbox(),
    rateLimitStore,
    idempotencyStore,
    overrides: {
      email: mail,
      breachedPasswords: new StaticBreachedPasswordChecker(["password123456"]),
      google:
        options.google === undefined
          ? new JoseGoogleIdTokenVerifier({ clientIds: [GOOGLE_CLIENT_ID], keys: googleJwks })
          : options.google,
      uniformResponseMs: UNIFORM_MS,
    },
  });
  const app = createApp({
    logger,
    version: "test",
    corsOrigins: [],
    readinessChecks: [],
    // Cada test usa su propia IP (X-Forwarded-For) para no compartir el límite de auth (10/min).
    trustedProxyHops: 1,
    rateLimitStore,
    idempotencyStore,
    accessTokenVerifier: identity.accessTokenVerifier,
    moduleRoutes: [identity.routes],
  });
  // Ruta "social" de prueba protegida por el guard de FR-AUTH-006.
  app.post("/v1/test/posts", requireVerifiedEmail, (c) => c.json({ ok: true }, 201));
  return app;
}

let app: ReturnType<typeof buildApp>;
let ip = "";

beforeAll(async () => {
  database = await setupTestDatabase("pawbook_test_identity");
  await redis.connect();
  app = buildApp();
});

afterAll(async () => {
  await deleteTestKeys();
  await redis.quit();
  await database.close();
});

beforeEach(async () => {
  await database.sql`truncate identity.users cascade`;
  await database.sql`truncate platform.outbox`;
  await deleteTestKeys();
  mail.sent.length = 0;
  ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
});

type Json = Record<string, unknown>;

function call(
  method: string,
  path: string,
  options: {
    body?: Json;
    token?: string;
    headers?: Record<string, string>;
    target?: typeof app;
  } = {},
) {
  const headers: Record<string, string> = { "X-Forwarded-For": ip, ...options.headers };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token !== undefined) headers.Authorization = `Bearer ${options.token}`;
  return (options.target ?? app).request(path, {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

const signUpBody = (email: string, overrides: Json = {}) => ({
  email,
  password: PASSWORD,
  birthDate: "1995-04-23",
  termsVersion: TERMS_VERSION,
  ...overrides,
});

function linkToken(email: string, template: string): string {
  const text = mail.lastTo(email, template)?.text ?? "";
  const match = /#token=([A-Za-z0-9_-]+)/.exec(text);
  if (match?.[1] === undefined) throw new Error(`Sin enlace ${template} para ${email}`);
  return match[1];
}

async function signIn(email: string, extra: Json = {}) {
  const res = await call("POST", "/v1/auth/sign-in", {
    body: { email, password: PASSWORD, ...extra },
  });
  expect(res.status).toBe(200);
  return AuthSessionSchema.parse(await res.json());
}

describe("registro → verificación → login → /me", () => {
  test("flujo completo con aceptación de términos y eventos en el outbox", async () => {
    const signUp = await call("POST", "/v1/auth/sign-up", { body: signUpBody("Ana@Example.com") });
    expect(signUp.status).toBe(202);
    expect(await signUp.json()).toMatchObject({ status: "verification-pending" });

    const session = await signIn("ana@example.com");
    expect(session.user).toMatchObject({ status: "pending_verification", emailVerified: false });
    expect(session.expiresIn).toBe(900);

    const verify = await call("POST", "/v1/auth/verify-email", {
      body: { token: linkToken("ana@example.com", "identity.verify-email") },
    });
    expect(verify.status).toBe(200);

    const fresh = await signIn("ana@example.com");
    const meRes = await call("GET", "/v1/me", { token: fresh.accessToken });
    expect(meRes.status).toBe(200);
    const me = MeSchema.parse(await meRes.json());
    expect(me).toMatchObject({
      email: "ana@example.com",
      status: "active",
      emailVerified: true,
      birthDate: "1995-04-23",
      termsAcceptance: { version: TERMS_VERSION },
    });

    const terms = await database.sql`
      select version, accepted_at from identity.terms_acceptances where user_id = ${me.id}`;
    expect(terms).toHaveLength(1);
    expect(terms[0]?.version).toBe(TERMS_VERSION);

    const events = await database.sql`select event_type, payload from platform.outbox order by id`;
    expect(events.map((row) => row.event_type)).toEqual([
      "identity.user-registered",
      "identity.email-verified",
    ]);
    // Sin datos personales en el outbox (NFR-OBS-002).
    expect(JSON.stringify(events)).not.toContain("ana@example.com");

    const stored = await database.sql`select password_hash from identity.users where id = ${me.id}`;
    expect(String(stored[0]?.password_hash)).toStartWith("$argon2id$");
  });

  test("/me sin token o con un token manipulado responde 401", async () => {
    expect((await call("GET", "/v1/me")).status).toBe(401);
    const res = await call("GET", "/v1/me", { token: "eyJhbGciOiJIUzI1NiJ9.e30.firma" });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Bearer");
  });

  test("un menor de la edad mínima recibe 422 sin crear la cuenta", async () => {
    const res = await call("POST", "/v1/auth/sign-up", {
      body: signUpBody("menor@example.com", { birthDate: "2012-05-01" }),
    });
    expect(res.status).toBe(422);
    const problem = ProblemSchema.parse(await res.json());
    expect(problem.errors?.[0]?.path).toBe("birthDate");
    expect(problem.detail).toContain("18");
    expect(await database.sql`select 1 from identity.users`).toHaveLength(0);
  });

  test("términos desactualizados, contraseña corta o filtrada responden 422", async () => {
    const outdated = await call("POST", "/v1/auth/sign-up", {
      body: signUpBody("a@example.com", { termsVersion: "2020-01-01" }),
    });
    expect(outdated.status).toBe(422);
    const short = await call("POST", "/v1/auth/sign-up", {
      body: signUpBody("a@example.com", { password: "corta" }),
    });
    expect(ProblemSchema.parse(await short.json()).errors?.[0]?.path).toBe("password");
    const breached = await call("POST", "/v1/auth/sign-up", {
      body: signUpBody("a@example.com", { password: "password123456" }),
    });
    expect(breached.status).toBe(422);
  });

  test("registrar un correo existente responde exactamente igual", async () => {
    const first = await call("POST", "/v1/auth/sign-up", { body: signUpBody("ana@example.com") });
    const second = await call("POST", "/v1/auth/sign-up", {
      body: signUpBody("ana@example.com", { password: "otra frase diferente" }),
    });
    expect(second.status).toBe(first.status);
    expect(await second.text()).toBe(await first.text());
    expect(await database.sql`select 1 from identity.users`).toHaveLength(1);
    expect(mail.lastTo("ana@example.com")?.template).toBe("identity.account-exists");
  });

  test("el registro admite Idempotency-Key", async () => {
    const headers = { "Idempotency-Key": "0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e61" };
    const body = signUpBody("idem@example.com");
    const first = await call("POST", "/v1/auth/sign-up", { body, headers });
    const replay = await call("POST", "/v1/auth/sign-up", { body, headers });
    expect(first.status).toBe(202);
    expect(replay.headers.get("idempotent-replayed")).toBe("true");
    expect(mail.sent).toHaveLength(1);
  });
});

describe("refresh rotatorio (FR-AUTH-004)", () => {
  test("rota el token y reutilizar el viejo revoca toda la familia", async () => {
    await call("POST", "/v1/auth/sign-up", { body: signUpBody("ana@example.com") });
    const login = await signIn("ana@example.com");

    const refreshed = await call("POST", "/v1/auth/refresh", {
      body: { refreshToken: login.refreshToken },
    });
    expect(refreshed.status).toBe(200);
    const rotated = AuthSessionSchema.parse(await refreshed.json());
    expect(rotated.refreshToken).not.toBe(login.refreshToken);
    expect(rotated.accessToken).not.toBe(login.accessToken);

    // Reuso del token ya rotado: 401 y la sesión queda revocada...
    const reuse = await call("POST", "/v1/auth/refresh", {
      body: { refreshToken: login.refreshToken },
    });
    expect(reuse.status).toBe(401);
    const sessions = await database.sql`select revoked_reason from identity.sessions`;
    expect(sessions.map((row) => row.revoked_reason)).toEqual(["reuse-detected"]);

    // ...así que el token legítimo más reciente tampoco sirve ya.
    const afterReuse = await call("POST", "/v1/auth/refresh", {
      body: { refreshToken: rotated.refreshToken },
    });
    expect(afterReuse.status).toBe(401);
  });

  test("dos refresh simultáneos con el mismo token: uno rota y se detecta el reuso", async () => {
    await call("POST", "/v1/auth/sign-up", { body: signUpBody("ana@example.com") });
    const login = await signIn("ana@example.com");
    const results = await Promise.all(
      [1, 2].map(() =>
        call("POST", "/v1/auth/refresh", { body: { refreshToken: login.refreshToken } }),
      ),
    );
    expect(results.map((res) => res.status).sort()).toEqual([200, 401]);
    const tokens = await database.sql`select used_at from identity.refresh_tokens`;
    expect(tokens).toHaveLength(2);
  });

  test("en web el refresh viaja en una cookie HttpOnly; Secure; SameSite=Lax", async () => {
    await call("POST", "/v1/auth/sign-up", { body: signUpBody("web@example.com") });
    const res = await call("POST", "/v1/auth/sign-in", {
      body: { email: "web@example.com", password: PASSWORD, refreshTokenDelivery: "cookie" },
    });
    expect(res.status).toBe(200);
    expect(AuthSessionSchema.parse(await res.json()).refreshToken).toBeNull();
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("__Secure-pawbook-refresh=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/v1/auth");

    const cookie = setCookie.split(";")[0] ?? "";
    const refreshed = await call("POST", "/v1/auth/refresh", { headers: { Cookie: cookie } });
    expect(refreshed.status).toBe(200);
    expect(AuthSessionSchema.parse(await refreshed.json()).refreshToken).toBeNull();
    expect(refreshed.headers.get("set-cookie")).toContain("__Secure-pawbook-refresh=");

    const signOut = await call("POST", "/v1/auth/sign-out", {
      headers: { Cookie: (refreshed.headers.get("set-cookie") ?? "").split(";")[0] ?? "" },
    });
    expect(signOut.status).toBe(204);
    expect(signOut.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  test("lista las sesiones activas y cierra una (FR-AUTH-007)", async () => {
    await call("POST", "/v1/auth/sign-up", { body: signUpBody("ana@example.com") });
    const phone = await signIn("ana@example.com");
    const laptop = await signIn("ana@example.com");

    const list = await call("GET", "/v1/me/sessions", { token: laptop.accessToken });
    const page = SessionPageSchema.parse(await list.json());
    expect(page.items).toHaveLength(2);
    expect(page.items.filter((session) => session.current)).toHaveLength(1);

    const phoneSession = page.items.find((session) => !session.current);
    const del = await call("DELETE", `/v1/me/sessions/${phoneSession?.id}`, {
      token: laptop.accessToken,
    });
    expect(del.status).toBe(204);
    const refresh = await call("POST", "/v1/auth/refresh", {
      body: { refreshToken: phone.refreshToken },
    });
    expect(refresh.status).toBe(401);
    const again = await call("DELETE", `/v1/me/sessions/${phoneSession?.id}`, {
      token: laptop.accessToken,
    });
    expect(again.status).toBe(404);
  });
});

describe("guard de correo verificado (FR-AUTH-006)", () => {
  test("una cuenta sin verificar inicia sesión pero no puede publicar", async () => {
    await call("POST", "/v1/auth/sign-up", { body: signUpBody("ana@example.com") });
    const login = await signIn("ana@example.com");

    const blocked = await call("POST", "/v1/test/posts", { token: login.accessToken });
    expect(blocked.status).toBe(403);
    expect(ProblemSchema.parse(await blocked.json()).type).toBe(
      "https://pawbook.app/problems/email-not-verified",
    );

    // Tras verificar, el access token renovado ya lleva el correo verificado.
    await call("POST", "/v1/auth/verify-email", {
      body: { token: linkToken("ana@example.com", "identity.verify-email") },
    });
    const refreshed = AuthSessionSchema.parse(
      await (
        await call("POST", "/v1/auth/refresh", { body: { refreshToken: login.refreshToken } })
      ).json(),
    );
    const allowed = await call("POST", "/v1/test/posts", { token: refreshed.accessToken });
    expect(allowed.status).toBe(201);
  });

  test("un enlace caducado responde 410 y se puede pedir otro", async () => {
    await call("POST", "/v1/auth/sign-up", { body: signUpBody("ana@example.com") });
    const token = linkToken("ana@example.com", "identity.verify-email");
    await database.sql`update identity.one_time_tokens set expires_at = now() - interval '1 second'`;
    const expired = await call("POST", "/v1/auth/verify-email", { body: { token } });
    expect(expired.status).toBe(410);
    expect(ProblemSchema.parse(await expired.json()).type).toBe(
      "https://pawbook.app/problems/link-expired",
    );

    const login = await signIn("ana@example.com");
    const resend = await call("POST", "/v1/auth/verify-email/resend", { token: login.accessToken });
    expect(resend.status).toBe(202);
    const fresh = linkToken("ana@example.com", "identity.verify-email");
    expect((await call("POST", "/v1/auth/verify-email", { body: { token: fresh } })).status).toBe(
      200,
    );
  });
});

describe("recuperación de contraseña (FR-AUTH-005)", () => {
  test("respuesta idéntica y en tiempo similar exista o no el correo", async () => {
    await call("POST", "/v1/auth/sign-up", { body: signUpBody("ana@example.com") });
    mail.sent.length = 0;

    const timed = async (email: string) => {
      const startedAt = performance.now();
      const res = await call("POST", "/v1/auth/password/forgot", { body: { email } });
      return { res, ms: performance.now() - startedAt, body: await res.text() };
    };
    const existing = await timed("ana@example.com");
    const missing = await timed("nadie@example.com");

    expect(existing.res.status).toBe(202);
    expect(missing.res.status).toBe(202);
    expect(missing.body).toBe(existing.body);
    // Ambas tardan al menos la duración uniforme configurada.
    expect(existing.ms).toBeGreaterThanOrEqual(UNIFORM_MS - 5);
    expect(missing.ms).toBeGreaterThanOrEqual(UNIFORM_MS - 5);
    expect(mail.sent.map((message) => message.to)).toEqual(["ana@example.com"]);
  });

  test("el enlace fija la contraseña una vez y cierra las sesiones", async () => {
    await call("POST", "/v1/auth/sign-up", { body: signUpBody("ana@example.com") });
    const login = await signIn("ana@example.com");
    await call("POST", "/v1/auth/password/forgot", { body: { email: "ana@example.com" } });
    const token = linkToken("ana@example.com", "identity.password-reset");

    const reset = await call("POST", "/v1/auth/password/reset", {
      body: { token, newPassword: "otra frase nueva y larga" },
    });
    expect(reset.status).toBe(204);
    const reused = await call("POST", "/v1/auth/password/reset", {
      body: { token, newPassword: "y otra frase más larga" },
    });
    expect(reused.status).toBe(400);

    expect(
      (await call("POST", "/v1/auth/refresh", { body: { refreshToken: login.refreshToken } }))
        .status,
    ).toBe(401);
    const oldPassword = await call("POST", "/v1/auth/sign-in", {
      body: { email: "ana@example.com", password: PASSWORD },
    });
    expect(oldPassword.status).toBe(401);
    const newPassword = await call("POST", "/v1/auth/sign-in", {
      body: { email: "ana@example.com", password: "otra frase nueva y larga" },
    });
    expect(newPassword.status).toBe(200);
  });
});

describe("login: errores uniformes y rate limit", () => {
  test("contraseña incorrecta y correo inexistente devuelven el mismo 401", async () => {
    await call("POST", "/v1/auth/sign-up", { body: signUpBody("ana@example.com") });
    const wrong = await call("POST", "/v1/auth/sign-in", {
      body: { email: "ana@example.com", password: "incorrecta" },
    });
    const missing = await call("POST", "/v1/auth/sign-in", {
      body: { email: "nadie@example.com", password: "incorrecta" },
    });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    const strip = (problem: unknown) => ({ ...ProblemSchema.parse(problem), requestId: undefined });
    expect(strip(await wrong.json())).toEqual(strip(await missing.json()));
  });

  test("más de 10 intentos por minuto desde la misma IP reciben 429", async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 11; attempt++) {
      const res = await call("POST", "/v1/auth/sign-in", {
        body: { email: "nadie@example.com", password: "incorrecta" },
      });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe("Google (FR-AUTH-003)", () => {
  test("crea la cuenta con fecha y términos, ya verificada", async () => {
    const idToken = await googleIdToken({ sub: "g-123", email: "luna@gmail.com" });
    const missing = await call("POST", "/v1/auth/google", { body: { idToken } });
    expect(missing.status).toBe(422);

    const res = await call("POST", "/v1/auth/google", {
      body: { idToken, birthDate: "1990-01-01", termsVersion: TERMS_VERSION },
    });
    expect(res.status).toBe(200);
    const session = GoogleSignInResponseSchema.parse(await res.json());
    expect(session.isNewUser).toBe(true);
    expect(session.user).toMatchObject({
      status: "active",
      termsAcceptance: { version: TERMS_VERSION },
    });

    const again = GoogleSignInResponseSchema.parse(
      await (await call("POST", "/v1/auth/google", { body: { idToken } })).json(),
    );
    expect(again.isNewUser).toBe(false);
    expect(again.user.id).toBe(session.user.id);
  });

  test("vincula una cuenta existente con el mismo correo", async () => {
    await call("POST", "/v1/auth/sign-up", { body: signUpBody("luna@gmail.com") });
    const idToken = await googleIdToken({ sub: "g-456", email: "luna@gmail.com" });
    const res = await call("POST", "/v1/auth/google", { body: { idToken } });
    expect(res.status).toBe(200);
    const session = GoogleSignInResponseSchema.parse(await res.json());
    expect(session.isNewUser).toBe(false);
    expect(session.user.emailVerified).toBe(true);
    const links = await database.sql`select provider, subject from identity.external_accounts`;
    expect([...links]).toEqual([{ provider: "google", subject: "g-456" }]);
  });

  test("rechaza un ID token inválido y responde 503 si Google no está configurado", async () => {
    const forged = await new SignJWT({ email: "x@gmail.com", email_verified: true })
      .setProtectedHeader({ alg: "RS256", kid: "g1" })
      .setSubject("g-1")
      .setIssuer("https://accounts.google.com")
      .setAudience("otra-app")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(googleKeys.privateKey);
    expect((await call("POST", "/v1/auth/google", { body: { idToken: forged } })).status).toBe(401);

    const disabled = await call("POST", "/v1/auth/google", {
      body: { idToken: forged },
      target: buildApp({ google: null }),
    });
    expect(disabled.status).toBe(503);
    expect(ProblemSchema.parse(await disabled.json()).type).toBe(
      "https://pawbook.app/problems/auth-provider-disabled",
    );
  });
});

describe("OpenAPI", () => {
  test("documenta la superficie de /v1/auth y /v1/me con seguridad Bearer", async () => {
    const doc = (await (await call("GET", "/v1/openapi.json")).json()) as {
      paths: Record<string, Record<string, { security?: unknown }>>;
      components: { securitySchemes: Record<string, unknown> };
    };
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        "/v1/auth/sign-up",
        "/v1/auth/sign-in",
        "/v1/auth/google",
        "/v1/auth/refresh",
        "/v1/auth/sign-out",
        "/v1/auth/verify-email",
        "/v1/auth/verify-email/resend",
        "/v1/auth/password/forgot",
        "/v1/auth/password/reset",
        "/v1/me",
        "/v1/me/sessions",
        "/v1/me/sessions/{id}",
      ]),
    );
    expect(doc.components.securitySchemes.bearerAuth).toBeDefined();
    expect(doc.paths["/v1/me"]?.get?.security).toEqual([{ bearerAuth: [] }]);
  });
});
