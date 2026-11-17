import packageJson from "../package.json" with { type: "json" };
import { loadConfig } from "./composition/config";
import { createContainer } from "./composition/container";
import { createIdentityModule } from "./composition/identity";
import { createApp } from "./http/app";
import { ValkeyIdempotencyStore } from "./http/idempotency/valkey-store";
import { ValkeyRateLimitStore } from "./http/rate-limit/valkey-store";

/*
 * Entrypoint HTTP. Usa Bun.serve si corre en Bun y @hono/node-server en Node 22: el mismo
 * build funciona en ambos runtimes (CON-TECH-002).
 */
const container = createContainer(loadConfig(process.env));
const { config, logger } = container;

const rateLimitStore = new ValkeyRateLimitStore(container.valkey);
const idempotencyStore = new ValkeyIdempotencyStore(container.valkey);
const identity = createIdentityModule({
  config,
  logger,
  unitOfWork: container.unitOfWork,
  outbox: container.outbox,
  rateLimitStore,
  idempotencyStore,
});

const app = createApp({
  logger,
  version: packageJson.version,
  corsOrigins: config.CORS_ORIGINS,
  readinessChecks: container.readinessChecks,
  trustedProxyHops: config.TRUSTED_PROXY_HOPS,
  rateLimitStore,
  idempotencyStore,
  accessTokenVerifier: identity.accessTokenVerifier,
  moduleRoutes: [identity.routes],
});

type Stoppable = { stop(): Promise<void> };

async function listen(): Promise<Stoppable> {
  if (typeof Bun !== "undefined") {
    const server = Bun.serve({ port: config.PORT, fetch: app.fetch });
    return { stop: () => server.stop() };
  }
  const { serve } = await import("@hono/node-server");
  const server = serve({ port: config.PORT, fetch: app.fetch });
  return {
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

const server = await listen();
logger.info(
  { port: config.PORT, runtime: typeof Bun !== "undefined" ? "bun" : "node" },
  "api listening",
);

// Cierre ordenado: deja de aceptar solicitudes y luego libera conexiones.
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "shutting down");
  await server.stop();
  await container.close();
  process.exit(0);
}
process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
