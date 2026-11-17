import { loadConfig } from "./composition/config";
import { createContainer } from "./composition/container";
import { registerModuleEventHandlers } from "./composition/event-handlers";
import { createWorker } from "./composition/worker";

/*
 * Entrypoint del worker: publica el outbox en pg-boss y ejecuta los handlers de eventos.
 * Mismo build para Bun (`bun run start:worker`) y Node 22 (`node dist/main.worker.js`).
 */
const container = createContainer(loadConfig(process.env));
const { logger } = container;
registerModuleEventHandlers(container);
const worker = createWorker(container);

await worker.start();
logger.info(
  {
    handlers: container.eventHandlers.length,
    runtime: typeof Bun !== "undefined" ? "bun" : "node",
  },
  "worker started",
);

// Cierre ordenado: el orquestador manda SIGTERM antes de matar el proceso.
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "worker shutting down");
  try {
    await worker.stop();
  } catch (error) {
    logger.error({ err: error }, "worker stop failed");
  }
  await container.close();
  process.exit(0);
}
process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
