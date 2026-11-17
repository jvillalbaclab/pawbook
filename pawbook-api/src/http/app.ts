import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { Logger } from "pino";
import { AppError } from "../shared/errors";
import { uuidv7 } from "../shared/ids";
import { REPLAYED_HEADER } from "./idempotency/middleware";
import type { IdempotencyStore } from "./idempotency/store";
import { type AccessTokenVerifier, authenticate, rejectInvalidToken } from "./middleware/auth";
import { clientIp } from "./middleware/client-ip";
import { handleError, handleNotFound } from "./middleware/errors";
import { requestLogger } from "./middleware/request-logger";
import { registerSharedComponents } from "./openapi-components";
import {
  RATE_LIMIT_EXPOSED_HEADERS,
  RATE_LIMITS,
  type RateLimitPolicy,
  rateLimit,
} from "./rate-limit/middleware";
import type { RateLimitStore } from "./rate-limit/store";
import { systemRoutes } from "./routes/system";
import type { AppEnv, ReadinessCheck } from "./types";

export type AppDependencies = {
  logger: Logger;
  version: string;
  corsOrigins: readonly string[];
  readinessChecks: readonly ReadinessCheck[];
  /** Proxies de confianza delante de la API (ver `TRUSTED_PROXY_HOPS`). */
  trustedProxyHops: number;
  rateLimitStore: RateLimitStore;
  /** Almacén de `Idempotency-Key` para las rutas de creación de los módulos. */
  idempotencyStore: IdempotencyStore;
  /** Límite global de /v1. Por defecto, 120 solicitudes/min (NFR-SEC-004). */
  globalRateLimit?: RateLimitPolicy;
  /** Verifica el Bearer de cada solicitud (lo implementa el módulo identity). */
  accessTokenVerifier: AccessTokenVerifier;
  /** Rutas de los módulos, montadas bajo /v1 (p. ej. identity: /auth/*, /me). */
  moduleRoutes?: readonly OpenAPIHono<AppEnv>[];
};

/** Cabeceras que los clientes envían además de las simples (§4.4, NFR-REL-001). */
const ALLOWED_HEADERS = [
  "Authorization",
  "Content-Type",
  "Idempotency-Key",
  "X-Pet-Id",
  "X-Request-Id",
];

/** Sondas del orquestador: se llaman cada pocos segundos y nunca deben recibir 429. */
const RATE_LIMIT_EXEMPT_PATHS = new Set(["/v1/health", "/v1/ready"]);

export function createApp(deps: AppDependencies) {
  const app = new OpenAPIHono<AppEnv>({
    // Los fallos de validación de Zod salen como 422 problem+json con un error por campo.
    defaultHook: (result) => {
      if (!result.success) {
        throw new AppError("validation-failed", {
          errors: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
      }
    },
  });

  // Acepta el X-Request-Id entrante (balanceador, web) o genera un UUIDv7.
  app.use(requestId({ generator: () => uuidv7() }));
  app.use(requestLogger(deps.logger));
  app.use(clientIp({ trustedProxyHops: deps.trustedProxyHops }));
  app.use(
    secureHeaders({
      // Es una API JSON: no carga recursos ni debe incrustarse en ningún sitio.
      contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      crossOriginResourcePolicy: "same-site",
    }),
  );
  app.use(
    cors({
      origin: [...deps.corsOrigins],
      credentials: true,
      allowHeaders: ALLOWED_HEADERS,
      exposeHeaders: ["X-Request-Id", ...RATE_LIMIT_EXPOSED_HEADERS, REPLAYED_HEADER],
      maxAge: 600,
    }),
  );
  // Auth antes del rate limit: con sesión, el límite cuenta por usuario y no por IP.
  app.use("/v1/*", authenticate(deps.accessTokenVerifier));
  // Va después de CORS para que un 429 lleve sus cabeceras y el navegador pueda leerlo.
  app.use(
    "/v1/*",
    rateLimit({
      ...(deps.globalRateLimit ?? RATE_LIMITS.default),
      store: deps.rateLimitStore,
      skip: (c) => RATE_LIMIT_EXEMPT_PATHS.has(c.req.path),
    }),
  );
  // Un Bearer inválido se rechaza después de contar contra el límite de la IP.
  app.use("/v1/*", rejectInvalidToken);

  app.route("/v1", systemRoutes({ version: deps.version, checks: deps.readinessChecks }));
  for (const routes of deps.moduleRoutes ?? []) app.route("/v1", routes);

  registerSharedComponents(app);
  app.doc31("/v1/openapi.json", {
    openapi: "3.1.0",
    info: { title: "PawBook API", version: deps.version },
    servers: [{ url: "/" }],
  });

  app.onError(handleError);
  app.notFound(handleNotFound);
  return app;
}

export type App = ReturnType<typeof createApp>;
