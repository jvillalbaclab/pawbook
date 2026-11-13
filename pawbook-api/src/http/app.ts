import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { Logger } from "pino";
import { AppError } from "../shared/errors";
import { uuidv7 } from "../shared/ids";
import { handleError, handleNotFound } from "./middleware/errors";
import { requestLogger } from "./middleware/request-logger";
import { systemRoutes } from "./routes/system";
import type { AppEnv, ReadinessCheck } from "./types";

export type AppDependencies = {
  logger: Logger;
  version: string;
  corsOrigins: readonly string[];
  readinessChecks: readonly ReadinessCheck[];
};

/** Cabeceras que los clientes envían además de las simples (§4.4, NFR-REL-001). */
const ALLOWED_HEADERS = [
  "Authorization",
  "Content-Type",
  "Idempotency-Key",
  "X-Pet-Id",
  "X-Request-Id",
];

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
      exposeHeaders: ["X-Request-Id"],
      maxAge: 600,
    }),
  );

  app.route("/v1", systemRoutes({ version: deps.version, checks: deps.readinessChecks }));

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
