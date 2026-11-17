import { type Clock, systemClock } from "../../shared/clock";
import type { DomainEvent, EventOutbox } from "../../shared/events";
import { uuidv7 } from "../../shared/ids";
import type { Transaction } from "../../shared/unit-of-work";
import { dbTransaction } from "./database";
import { outbox } from "./schema/platform";

/** Escribe los eventos en `platform.outbox` dentro de la transacción del caso de uso. */
export class DrizzleEventOutbox implements EventOutbox {
  constructor(private readonly clock: Clock = systemClock) {}

  async enqueue(tx: Transaction, events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    await dbTransaction(tx)
      .insert(outbox)
      .values(
        events.map((event) => ({
          id: uuidv7(this.clock),
          eventType: event.type,
          payload: event.payload,
          occurredAt: event.occurredAt,
        })),
      );
  }
}
