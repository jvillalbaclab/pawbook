import type { PgBoss } from "pg-boss";
import type { Logger } from "pino";
import type { JsonObject } from "../../shared/events";
import type { Uuid } from "../../shared/ids";

/*
 * Relay del outbox: mueve los eventos de `platform.outbox` a las colas de pg-boss.
 *
 * Todo ocurre en UNA transacción del pool de pg-boss: reclamar filas con
 * `FOR UPDATE SKIP LOCKED`, insertar los jobs (pg-boss acepta la transacción en la opción `db`)
 * y marcar `published_at`. Si el proceso muere a mitad, nada se confirma y otra réplica retoma
 * las filas; no hay ventana en la que un evento quede publicado sin marcar ni al revés.
 * `SKIP LOCKED` hace que dos réplicas se repartan las filas en vez de esperarse o duplicarlas.
 *
 * Usa el driver de pg-boss (y no Drizzle) porque es el que pg-boss sabe usar dentro de una
 * transacción; las consultas son pocas y fijas.
 */

/** Lo que viaja en cada job: el evento serializado más su ID de outbox. */
export type OutboxMessage = {
  readonly eventId: Uuid;
  readonly type: string;
  readonly occurredAt: string;
  readonly payload: JsonObject;
};

type OutboxRow = {
  id: Uuid;
  event_type: string;
  payload: JsonObject;
  occurred_at: Date;
};

/** Lo único que el relay usa de pg-boss; permite probar la lógica del lote sin base de datos. */
export type RelayBoss = Pick<PgBoss, "getDb" | "publish">;

export type RelayOptions = {
  /** Filas reclamadas por transacción. */
  readonly batchSize: number;
  /** Fallos de publicación tras los que una fila se deja para revisión manual. */
  readonly maxAttempts: number;
  /** Espera entre consultas cuando no hay nada pendiente. */
  readonly pollIntervalMs: number;
};

export const DEFAULT_RELAY_OPTIONS: RelayOptions = {
  batchSize: 100,
  maxAttempts: 10,
  pollIntervalMs: 1_000,
};

export type BatchResult = {
  readonly published: Uuid[];
  readonly failed: Uuid[];
};

const CLAIM_SQL = `
  select id, event_type, payload, occurred_at
  from platform.outbox
  where published_at is null and attempts < $2
  order by id
  limit $1
  for update skip locked`;

const MARK_PUBLISHED_SQL = `
  update platform.outbox set published_at = now() where id = any($1::uuid[])`;

const MARK_FAILED_SQL = `
  update platform.outbox set attempts = attempts + 1, last_error = $2 where id = $1`;

const MAX_ERROR_LENGTH = 2_000;

export class OutboxRelay {
  private readonly options: RelayOptions;
  private running = false;
  private loop: Promise<void> | undefined;
  private wake: (() => void) | undefined;

  constructor(
    private readonly boss: RelayBoss,
    private readonly logger: Logger,
    options: Partial<RelayOptions> = {},
  ) {
    this.options = { ...DEFAULT_RELAY_OPTIONS, ...options };
  }

  /** Publica un lote. Devuelve qué filas publicó esta llamada y cuáles fallaron. */
  async publishBatch(): Promise<BatchResult> {
    const db = this.boss.getDb();
    if (db.beginTransaction === undefined) {
      throw new Error("El adaptador de base de datos de pg-boss no soporta transacciones");
    }
    const tx = await db.beginTransaction();
    try {
      const { rows } = await tx.db.executeSql(CLAIM_SQL, [
        this.options.batchSize,
        this.options.maxAttempts,
      ]);
      const claimed: OutboxRow[] = rows;
      const published: Uuid[] = [];
      const failed: Uuid[] = [];

      for (const row of claimed) {
        // Savepoint por evento: un fallo deshace solo los jobs de ese evento, no el lote.
        await tx.db.executeSql("savepoint outbox_event");
        try {
          const message: OutboxMessage = {
            eventId: row.id,
            type: row.event_type,
            occurredAt: row.occurred_at.toISOString(),
            payload: row.payload,
          };
          // Un job por cola suscrita al tipo de evento. El ID del job es el del evento: aunque
          // algo fallara después, la clave (cola, id) de pg-boss impide un segundo job igual.
          await this.boss.publish(row.event_type, message, { db: tx.db, id: row.id });
          await tx.db.executeSql("release savepoint outbox_event");
          published.push(row.id);
        } catch (error) {
          await tx.db.executeSql("rollback to savepoint outbox_event");
          const reason = error instanceof Error ? error.message : String(error);
          await tx.db.executeSql(MARK_FAILED_SQL, [row.id, reason.slice(0, MAX_ERROR_LENGTH)]);
          failed.push(row.id);
          this.logger.warn(
            { err: error, eventId: row.id, eventType: row.event_type },
            "outbox event publish failed",
          );
        }
      }

      if (published.length > 0) await tx.db.executeSql(MARK_PUBLISHED_SQL, [published]);
      await tx.commit();
      return { published, failed };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  /** Arranca el bucle de sondeo. Si un lote sale lleno, repite sin esperar. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop = this.run();
  }

  /** Termina el lote en curso (su transacción se confirma o se deshace) y para. */
  async stop(): Promise<void> {
    this.running = false;
    this.wake?.();
    await this.loop;
  }

  private async run(): Promise<void> {
    while (this.running) {
      let full = false;
      try {
        const { published, failed } = await this.publishBatch();
        full = published.length + failed.length >= this.options.batchSize;
        if (published.length > 0) {
          this.logger.debug({ count: published.length }, "outbox events published");
        }
      } catch (error) {
        this.logger.error({ err: error }, "outbox relay batch failed");
      }
      if (!full && this.running) await this.sleep(this.options.pollIntervalMs);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(done, ms);
      function done() {
        clearTimeout(timer);
        resolve();
      }
      this.wake = done;
    });
  }
}
