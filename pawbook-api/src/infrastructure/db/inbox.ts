import { type Clock, systemClock } from "../../shared/clock";
import { uuidv7 } from "../../shared/ids";
import type { Inbox, ProcessOnceResult } from "../../shared/inbox";
import type { Transaction, UnitOfWork } from "../../shared/unit-of-work";
import { dbTransaction } from "./database";
import { inboxEvents } from "./schema/platform";

/**
 * La marca se inserta con `ON CONFLICT DO NOTHING` al principio de la transacción. Si dos
 * entregas del mismo evento llegan a la vez, la segunda espera al bloqueo de la clave única:
 * si la primera confirma, la segunda no inserta nada y se salta; si hace rollback, la segunda
 * inserta y procesa. Nunca se aplican las dos.
 */
export class DrizzleInbox implements Inbox {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock = systemClock,
  ) {}

  processOnce<T>(
    source: string,
    externalId: string,
    fn: (tx: Transaction) => Promise<T>,
  ): Promise<ProcessOnceResult<T>> {
    return this.unitOfWork.run(async (tx): Promise<ProcessOnceResult<T>> => {
      const inserted = await dbTransaction(tx)
        .insert(inboxEvents)
        .values({ id: uuidv7(this.clock), source, externalId, receivedAt: this.clock.now() })
        .onConflictDoNothing({ target: [inboxEvents.source, inboxEvents.externalId] })
        .returning({ id: inboxEvents.id });
      if (inserted.length === 0) return { processed: false };
      return { processed: true, value: await fn(tx) };
    });
  }
}
