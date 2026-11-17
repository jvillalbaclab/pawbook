import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { DrizzleUnitOfWork } from "../src/infrastructure/db/database";
import { DrizzleEventOutbox } from "../src/infrastructure/db/outbox";
import { outbox } from "../src/infrastructure/db/schema/platform";
import { fixedClock } from "../src/shared/clock";
import { domainEvent } from "../src/shared/events";
import { isUuidV7 } from "../src/shared/ids";
import type { Transaction } from "../src/shared/unit-of-work";
import { resetPlatformTables, setupTestDatabase, type TestDatabase } from "./support/database";

let database: TestDatabase;
let unitOfWork: DrizzleUnitOfWork;
const eventOutbox = new DrizzleEventOutbox();

beforeAll(async () => {
  database = await setupTestDatabase();
  unitOfWork = new DrizzleUnitOfWork(database.db);
});

afterAll(async () => {
  await database.close();
});

beforeEach(async () => {
  await resetPlatformTables(database.sql);
});

const clock = fixedClock(new Date("2026-11-17T10:00:00.000Z"));
const petCreated = () => domainEvent("pets.pet-created", { petId: "p-1", name: "Toby" }, clock);

describe("DrizzleEventOutbox", () => {
  test("guarda el evento cuando la transacción confirma", async () => {
    await unitOfWork.run((tx) => eventOutbox.enqueue(tx, [petCreated()]));

    const rows = await database.db.select().from(outbox);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(isUuidV7(row?.id ?? "")).toBe(true);
    expect(row?.eventType).toBe("pets.pet-created");
    expect(row?.payload).toEqual({ petId: "p-1", name: "Toby" });
    expect(row?.occurredAt).toEqual(new Date("2026-11-17T10:00:00.000Z"));
    expect(row?.publishedAt).toBeNull();
    expect(row?.attempts).toBe(0);
  });

  test("no deja ningún evento si la transacción hace rollback", async () => {
    const failing = unitOfWork.run(async (tx) => {
      await eventOutbox.enqueue(tx, [petCreated(), petCreated()]);
      throw new Error("falla el cambio de dominio");
    });

    await expect(failing).rejects.toThrow("falla el cambio de dominio");
    expect(await database.db.select().from(outbox)).toHaveLength(0);
  });

  test("rechaza usar la transacción después de confirmarla", async () => {
    let leaked: Transaction | undefined;
    await unitOfWork.run(async (tx) => {
      leaked = tx;
    });
    if (leaked === undefined) throw new Error("run no ejecutó el trabajo");
    const late = leaked;

    await expect(eventOutbox.enqueue(late, [petCreated()])).rejects.toThrow(/ya terminó/);
  });
});
