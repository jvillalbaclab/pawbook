import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { DrizzleUnitOfWork } from "../src/infrastructure/db/database";
import { DrizzleInbox } from "../src/infrastructure/db/inbox";
import { DrizzleEventOutbox } from "../src/infrastructure/db/outbox";
import { inboxEvents, outbox } from "../src/infrastructure/db/schema/platform";
import { domainEvent } from "../src/shared/events";
import { resetPlatformTables, setupTestDatabase, type TestDatabase } from "./support/database";

let database: TestDatabase;
let inbox: DrizzleInbox;

beforeAll(async () => {
  database = await setupTestDatabase();
  inbox = new DrizzleInbox(new DrizzleUnitOfWork(database.db));
});

afterAll(async () => {
  await database.close();
});

beforeEach(async () => {
  await resetPlatformTables(database.sql);
});

describe("DrizzleInbox.processOnce", () => {
  test("ejecuta la función una sola vez por fuente e ID externo", async () => {
    let calls = 0;
    const effect = async () => {
      calls += 1;
      return "hecho";
    };

    const first = await inbox.processOnce("stream", "evt-1", effect);
    const second = await inbox.processOnce("stream", "evt-1", effect);
    const otherSource = await inbox.processOnce("outbox", "evt-1", effect);

    expect(first).toEqual({ processed: true, value: "hecho" });
    expect(second).toEqual({ processed: false });
    expect(otherSource).toEqual({ processed: true, value: "hecho" });
    expect(calls).toBe(2);
  });

  test("si la función falla no deja marca y el reintento vuelve a ejecutarla", async () => {
    await expect(
      inbox.processOnce("stream", "evt-2", async () => {
        throw new Error("Stream no responde");
      }),
    ).rejects.toThrow("Stream no responde");
    expect(await database.db.select().from(inboxEvents)).toHaveLength(0);

    const retry = await inbox.processOnce("stream", "evt-2", async () => "ok");
    expect(retry).toEqual({ processed: true, value: "ok" });
  });

  test("dos entregas simultáneas del mismo evento solo aplican el efecto una vez", async () => {
    let calls = 0;
    const slowEffect = async () => {
      calls += 1;
      await Bun.sleep(150);
    };

    const results = await Promise.all([
      inbox.processOnce("stream", "evt-3", slowEffect),
      inbox.processOnce("stream", "evt-3", slowEffect),
    ]);

    expect(calls).toBe(1);
    expect(results.filter((result) => result.processed)).toHaveLength(1);
  });

  test("lo que escribe la función se confirma en la misma transacción que la marca", async () => {
    const outboxAdapter = new DrizzleEventOutbox();
    await expect(
      inbox.processOnce("stream", "evt-4", async (tx) => {
        await outboxAdapter.enqueue(tx, [domainEvent("social.post-flagged", { postId: "x" })]);
        throw new Error("falla después de escribir");
      }),
    ).rejects.toThrow();

    expect(await database.db.select().from(outbox)).toHaveLength(0);
    expect(await database.db.select().from(inboxEvents)).toHaveLength(0);
  });
});
