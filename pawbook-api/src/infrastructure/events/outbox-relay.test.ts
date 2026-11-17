import { describe, expect, test } from "bun:test";
import type { Db, SendOptions } from "pg-boss";
import pino from "pino";
import { type Uuid, uuidv7 } from "../../shared/ids";
import { OutboxRelay, type RelayBoss } from "./outbox-relay";

/*
 * Prueba la lógica del lote (savepoints, marcas, commit/rollback) con un pg-boss falso que
 * solo registra las sentencias. La concurrencia real se prueba contra Postgres en test/.
 */

type Row = { id: Uuid; event_type: string; payload: object; occurred_at: Date };

function fakeBoss(rows: Row[], failingTypes: string[] = []) {
  const statements: string[] = [];
  const published: Array<{ event: string; data: unknown; id: string | undefined }> = [];
  let outcome: "open" | "committed" | "rolled-back" = "open";

  const txDb: Db = {
    executeSql: async (text, values) => {
      const statement = text.trim().split(/\s+/).slice(0, 3).join(" ");
      statements.push(values === undefined ? statement : `${statement} ${JSON.stringify(values)}`);
      return { rows: text.includes("for update skip locked") ? rows : [] };
    },
  };

  const boss: RelayBoss = {
    getDb: () => ({
      executeSql: async () => ({ rows: [] }),
      beginTransaction: async () => ({
        db: txDb,
        commit: async () => {
          outcome = "committed";
        },
        rollback: async () => {
          outcome = "rolled-back";
        },
      }),
    }),
    publish: async (event: string, data?: object, options?: SendOptions) => {
      if (failingTypes.includes(event)) throw new Error(`no se pudo publicar ${event}`);
      published.push({ event, data, id: options?.id });
    },
  };

  return { boss, statements, published, outcome: () => outcome };
}

const silent = pino({ level: "silent" });
const occurredAt = new Date("2026-11-17T10:00:00.000Z");
const e1 = uuidv7();
const e2 = uuidv7();

describe("OutboxRelay.publishBatch", () => {
  test("publica cada fila con el ID del evento como ID del job y marca las publicadas", async () => {
    const fake = fakeBoss([
      { id: e1, event_type: "pets.pet-created", payload: { petId: "1" }, occurred_at: occurredAt },
    ]);
    const relay = new OutboxRelay(fake.boss, silent, { batchSize: 10, maxAttempts: 3 });

    const result = await relay.publishBatch();

    expect(result).toEqual({ published: [e1], failed: [] });
    expect(fake.published).toEqual([
      {
        event: "pets.pet-created",
        id: e1,
        data: {
          eventId: e1,
          type: "pets.pet-created",
          occurredAt: "2026-11-17T10:00:00.000Z",
          payload: { petId: "1" },
        },
      },
    ]);
    expect(fake.statements).toEqual([
      "select id, event_type, [10,3]",
      "savepoint outbox_event",
      "release savepoint outbox_event",
      `update platform.outbox set [["${e1}"]]`,
    ]);
    expect(fake.outcome()).toBe("committed");
  });

  test("un evento que falla se deshace solo y cuenta el intento sin frenar el resto", async () => {
    const fake = fakeBoss(
      [
        { id: e1, event_type: "pets.broken", payload: {}, occurred_at: occurredAt },
        { id: e2, event_type: "pets.pet-created", payload: {}, occurred_at: occurredAt },
      ],
      ["pets.broken"],
    );
    const relay = new OutboxRelay(fake.boss, silent);

    const result = await relay.publishBatch();

    expect(result).toEqual({ published: [e2], failed: [e1] });
    expect(fake.statements).toEqual([
      "select id, event_type, [100,10]",
      "savepoint outbox_event",
      "rollback to savepoint",
      `update platform.outbox set ["${e1}","no se pudo publicar pets.broken"]`,
      "savepoint outbox_event",
      "release savepoint outbox_event",
      `update platform.outbox set [["${e2}"]]`,
    ]);
    expect(fake.outcome()).toBe("committed");
  });

  test("sin filas pendientes confirma sin escribir nada", async () => {
    const fake = fakeBoss([]);
    const result = await new OutboxRelay(fake.boss, silent).publishBatch();

    expect(result).toEqual({ published: [], failed: [] });
    expect(fake.statements).toHaveLength(1);
    expect(fake.outcome()).toBe("committed");
  });
});
