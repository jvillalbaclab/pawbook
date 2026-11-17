import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { isNull } from "drizzle-orm";
import { PgBoss } from "pg-boss";
import pino from "pino";
import { DrizzleUnitOfWork } from "../src/infrastructure/db/database";
import { DrizzleEventOutbox } from "../src/infrastructure/db/outbox";
import { outbox } from "../src/infrastructure/db/schema/platform";
import { queueName, registerEventHandlers } from "../src/infrastructure/events/event-handlers";
import { OutboxRelay } from "../src/infrastructure/events/outbox-relay";
import { type DeliveredEvent, type DomainEvent, domainEvent } from "../src/shared/events";
import type { Uuid } from "../src/shared/ids";
import { resetPlatformTables, setupTestDatabase, type TestDatabase } from "./support/database";

/*
 * Relay real contra Postgres y pg-boss. Los tipos de evento llevan un sufijo aleatorio
 * porque las colas de pg-boss persisten entre ejecuciones en la BD de tests.
 */
const silent = pino({ level: "silent" });
const runId = Math.random().toString(36).slice(2, 10);

let database: TestDatabase;
let unitOfWork: DrizzleUnitOfWork;
const eventOutbox = new DrizzleEventOutbox();
const bosses: PgBoss[] = [];

async function startBoss(): Promise<PgBoss> {
  const boss = new PgBoss({ connectionString: database.url, max: 3 });
  boss.on("error", (error) => console.error("pg-boss", error));
  await boss.start();
  bosses.push(boss);
  return boss;
}

async function enqueue(events: DomainEvent[]): Promise<void> {
  await unitOfWork.run((tx) => eventOutbox.enqueue(tx, events));
}

beforeAll(async () => {
  database = await setupTestDatabase();
  unitOfWork = new DrizzleUnitOfWork(database.db);
});

afterAll(async () => {
  await Promise.all(bosses.map((boss) => boss.stop({ graceful: false })));
  await database.close();
});

beforeEach(async () => {
  await resetPlatformTables(database.sql);
});

describe("OutboxRelay + worker", () => {
  test("publica el evento en la cola de su handler, lo marca y el handler lo recibe", async () => {
    const boss = await startBoss();
    const type = `tests.relay-${runId}`;
    let deliver: (event: DeliveredEvent) => void = () => {};
    const received = new Promise<DeliveredEvent>((resolve) => {
      deliver = resolve;
    });
    await registerEventHandlers(
      boss,
      [{ eventType: type, name: "tests.collector", handle: async (e) => deliver(e) }],
      silent,
    );
    const event = domainEvent(type, { petId: "p-1" });
    await enqueue([event]);
    const relay = new OutboxRelay(boss, silent);

    const result = await relay.publishBatch();

    const [row] = await database.db.select().from(outbox);
    expect(result).toEqual({ published: [row?.id as Uuid], failed: [] });
    expect(row?.publishedAt).toBeInstanceOf(Date);

    const delivered = await received;
    expect(delivered).toEqual({ ...event, id: row?.id as Uuid });

    // Ya publicado: un segundo lote no lo vuelve a tomar.
    expect(await relay.publishBatch()).toEqual({ published: [], failed: [] });
  }, 15_000);

  test("un evento sin suscriptores se marca publicado igualmente", async () => {
    const boss = await startBoss();
    await enqueue([domainEvent(`tests.nobody-${runId}`, {})]);

    const result = await new OutboxRelay(boss, silent).publishBatch();

    expect(result.published).toHaveLength(1);
    expect(await database.db.select().from(outbox).where(isNull(outbox.publishedAt))).toEqual([]);
  });

  test("el bucle publica en segundo plano y stop termina limpio", async () => {
    const boss = await startBoss();
    const relay = new OutboxRelay(boss, silent, { pollIntervalMs: 50 });
    relay.start();
    await enqueue([domainEvent(`tests.loop-${runId}`, {})]);

    const deadline = Date.now() + 5_000;
    let pending = 1;
    while (pending > 0 && Date.now() < deadline) {
      await Bun.sleep(50);
      pending = (await database.db.select().from(outbox).where(isNull(outbox.publishedAt))).length;
    }
    await relay.stop();

    expect(pending).toBe(0);
  }, 10_000);

  test("dos workers concurrentes no publican el mismo evento dos veces", async () => {
    const [bossA, bossB] = await Promise.all([startBoss(), startBoss()]);
    if (bossA === undefined || bossB === undefined) throw new Error("pg-boss no arrancó");
    const type = `tests.concurrent-${runId}`;
    // Cola suscrita sin worker: los jobs se quedan en ella para contarlos.
    const queue = queueName({ eventType: type, name: "tests.counter" });
    await bossA.createQueue(queue);
    await bossA.subscribe(type, queue);
    const total = 60;
    await enqueue(Array.from({ length: total }, (_, index) => domainEvent(type, { index })));

    const drain = async (relay: OutboxRelay): Promise<Uuid[]> => {
      const published: Uuid[] = [];
      for (;;) {
        const batch = await relay.publishBatch();
        if (batch.published.length === 0 && batch.failed.length === 0) return published;
        published.push(...batch.published);
      }
    };
    const [fromA, fromB] = await Promise.all([
      drain(new OutboxRelay(bossA, silent, { batchSize: 5 })),
      drain(new OutboxRelay(bossB, silent, { batchSize: 5 })),
    ]);

    const overlap = fromA.filter((id) => fromB.includes(id));
    expect(overlap).toEqual([]);
    expect(new Set([...fromA, ...fromB]).size).toBe(total);
    expect(await bossA.findJobs(queue, { limit: 1_000 })).toHaveLength(total);
    expect(await database.db.select().from(outbox).where(isNull(outbox.publishedAt))).toEqual([]);
  }, 20_000);
});
