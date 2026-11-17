import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import Redis from "ioredis";
import { ValkeyIdempotencyStore } from "../src/http/idempotency/valkey-store";
import { ValkeyRateLimitStore } from "../src/http/rate-limit/valkey-store";

/*
 * Integración contra el Valkey local de docker-compose (`bun run db:up`). Todas las claves
 * llevan el prefijo `test:http:` y se borran al terminar, así que no toca datos de desarrollo.
 */
const PREFIX = "test:http:";
const redis = new Redis(process.env.VALKEY_URL ?? "redis://localhost:6380", {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});

async function deleteTestKeys() {
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", `${PREFIX}*`, "COUNT", 500);
    if (keys.length > 0) await redis.del(...keys);
    cursor = next;
  } while (cursor !== "0");
}

beforeAll(async () => {
  await redis.connect();
  await deleteTestKeys();
});

afterAll(async () => {
  await deleteTestKeys();
  await redis.quit();
});

describe("ValkeyRateLimitStore", () => {
  const store = new ValkeyRateLimitStore(redis, `${PREFIX}rl:`);

  test("cuenta y fija la caducidad solo en la primera solicitud de la ventana", async () => {
    const first = await store.hit("ttl", 60_000);
    expect(first.count).toBe(1);
    expect(first.resetInMs).toBeGreaterThan(59_000);
    expect(first.resetInMs).toBeLessThanOrEqual(60_000);

    await Bun.sleep(50);
    const second = await store.hit("ttl", 60_000);
    expect(second.count).toBe(2);
    // La ventana no se alarga con cada solicitud: el TTL sigue bajando.
    expect(second.resetInMs).toBeLessThan(first.resetInMs);
  });

  test("es atómico con solicitudes concurrentes", async () => {
    const hits = await Promise.all(
      Array.from({ length: 200 }, () => store.hit("concurrent", 60_000)),
    );
    const counts = hits.map((hit) => hit.count).sort((a, b) => a - b);
    expect(counts).toEqual(Array.from({ length: 200 }, (_, n) => n + 1));
  });

  test("reinicia el contador al caducar la ventana", async () => {
    await store.hit("expiry", 100);
    await store.hit("expiry", 100);
    await Bun.sleep(150);
    expect((await store.hit("expiry", 100)).count).toBe(1);
  });

  test("repara una clave que quedó sin caducidad", async () => {
    await redis.set(`${PREFIX}rl:orphan`, "5");
    const hit = await store.hit("orphan", 60_000);
    expect(hit.count).toBe(6);
    expect(await redis.pttl(`${PREFIX}rl:orphan`)).toBeGreaterThan(0);
  });
});

describe("ValkeyIdempotencyStore", () => {
  const store = new ValkeyIdempotencyStore(redis, `${PREFIX}idem:`);
  const response = { status: 201, headers: { "content-type": "application/json" }, body: "{}" };

  test("solo una de varias solicitudes concurrentes reserva la key", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => store.begin("race", "huella", 60_000)),
    );
    expect(results.filter((result) => result === null)).toHaveLength(1);
    expect(results.filter((result) => result?.state === "in-progress")).toHaveLength(19);
  });

  test("guarda la respuesta con su TTL y la devuelve en el siguiente begin", async () => {
    expect(await store.begin("done", "huella", 60_000)).toBeNull();
    await store.complete(
      "done",
      { state: "completed", fingerprint: "huella", response },
      86_400_000,
    );
    expect(await store.begin("done", "otra", 60_000)).toEqual({
      state: "completed",
      fingerprint: "huella",
      response,
    });
    const ttl = await redis.pttl(`${PREFIX}idem:done`);
    expect(ttl).toBeGreaterThan(86_000_000);
  });

  test("la reserva caduca sola y release la libera", async () => {
    expect(await store.begin("lock", "huella", 100)).toBeNull();
    await Bun.sleep(150);
    expect(await store.begin("lock", "huella", 60_000)).toBeNull();
    await store.release("lock");
    expect(await redis.exists(`${PREFIX}idem:lock`)).toBe(0);
  });
});
