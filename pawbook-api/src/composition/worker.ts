import { PgBoss } from "pg-boss";
import { registerEventHandlers } from "../infrastructure/events/event-handlers";
import { OutboxRelay, type RelayOptions } from "../infrastructure/events/outbox-relay";
import type { Container } from "./container";

/*
 * Wiring del worker: pg-boss (con su propio pool pequeño, separado del de la API), el relay
 * del outbox y los handlers de eventos. Varias réplicas pueden correr a la vez.
 */
export type Worker = {
  boss: PgBoss;
  relay: OutboxRelay;
  start(): Promise<void>;
  /** Deja de reclamar eventos, espera a los jobs en curso y libera conexiones. */
  stop(): Promise<void>;
};

const GRACEFUL_STOP_TIMEOUT_MS = 25_000;

export function createWorker(
  container: Container,
  options: { relay?: Partial<RelayOptions> } = {},
): Worker {
  const { config, logger } = container;
  const boss = new PgBoss({
    connectionString: config.DATABASE_URL,
    application_name: "pawbook-worker",
    max: 5,
  });
  boss.on("error", (error) => logger.error({ err: error }, "pg-boss error"));

  const relay = new OutboxRelay(boss, logger, options.relay);

  return {
    boss,
    relay,
    start: async () => {
      await boss.start();
      await registerEventHandlers(boss, container.eventHandlers, logger);
      relay.start();
    },
    stop: async () => {
      await relay.stop();
      await boss.stop({ graceful: true, timeout: GRACEFUL_STOP_TIMEOUT_MS });
    },
  };
}
