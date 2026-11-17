import type { PgBoss, Queue } from "pg-boss";
import type { Logger } from "pino";
import type { DeliveredEvent, EventHandler } from "../../shared/events";
import type { OutboxMessage } from "./outbox-relay";

/*
 * Registro de handlers en pg-boss. Cada handler tiene su cola `<tipo>/<consumidor>` suscrita al
 * tipo de evento, de modo que `publish(tipo)` deja un job en cada una y un handler que falla
 * se reintenta solo, sin repetir el trabajo de los demás.
 */

/**
 * Reintentos con backoff exponencial de pg-boss (NFR-REL-001): ~5 s, 10 s, 20 s... hasta
 * 10 min entre intentos. Agotados los reintentos, el job queda en estado `failed`.
 */
export const HANDLER_QUEUE_OPTIONS = {
  retryLimit: 8,
  retryDelay: 5,
  retryBackoff: true,
  retryDelayMax: 600,
  expireInSeconds: 300,
} as const satisfies Omit<Queue, "name">;

export function queueName(handler: Pick<EventHandler, "eventType" | "name">): string {
  return `${handler.eventType}/${handler.name}`;
}

/** Falla al arrancar si dos handlers comparten cola: se robarían los jobs entre sí. */
export function assertUniqueQueues(handlers: readonly EventHandler[]): void {
  const seen = new Set<string>();
  for (const handler of handlers) {
    const name = queueName(handler);
    if (seen.has(name)) throw new Error(`Handler de eventos duplicado: ${name}`);
    seen.add(name);
  }
}

export function toDeliveredEvent(message: OutboxMessage): DeliveredEvent {
  return {
    id: message.eventId,
    type: message.type,
    occurredAt: new Date(message.occurredAt),
    payload: message.payload,
  };
}

export async function registerEventHandlers(
  boss: PgBoss,
  handlers: readonly EventHandler[],
  logger: Logger,
): Promise<void> {
  assertUniqueQueues(handlers);
  for (const handler of handlers) {
    const name = queueName(handler);
    // createQueue no toca una cola existente: cambiar sus opciones exige `updateQueue`.
    await boss.createQueue(name, HANDLER_QUEUE_OPTIONS);
    await boss.subscribe(handler.eventType, name);
    await boss.work<OutboxMessage>(name, async (jobs) => {
      // batchSize por defecto es 1, pero se recorre el lote por si se sube en el futuro.
      for (const job of jobs) {
        const event = toDeliveredEvent(job.data);
        try {
          await handler.handle(event);
        } catch (error) {
          logger.warn(
            { err: error, queue: name, eventId: event.id, retryCount: job.retryCount },
            "event handler failed",
          );
          throw error; // pg-boss lo reintenta según HANDLER_QUEUE_OPTIONS.
        }
      }
    });
  }
}
