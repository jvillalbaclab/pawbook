import type Redis from "ioredis";
import { z } from "zod";
import type { IdempotencyRecord, IdempotencyStore } from "./store";

/*
 * SET NX + GET en un script Lua: o reservamos la key, o leemos el registro que la ocupa, sin
 * la carrera de hacerlo en dos comandos (la reserva ajena podría caducar entre ambos).
 */
const BEGIN_SCRIPT = `
if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2]) then
  return false
end
return redis.call('GET', KEYS[1])
`;

const RecordSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("in-progress"), fingerprint: z.string() }),
  z.object({
    state: z.literal("completed"),
    fingerprint: z.string(),
    response: z.object({
      status: z.number().int(),
      headers: z.record(z.string(), z.string()),
      body: z.string(),
    }),
  }),
]);

export class ValkeyIdempotencyStore implements IdempotencyStore {
  readonly #redis: Redis;
  readonly #prefix: string;

  /** `prefix` aísla las claves (p. ej. `idempotency:` en producción, `test:http:` en tests). */
  constructor(redis: Redis, prefix = "idempotency:") {
    this.#redis = redis;
    this.#prefix = prefix;
  }

  async begin(key: string, fingerprint: string, lockTtlMs: number) {
    const pending: IdempotencyRecord = { state: "in-progress", fingerprint };
    const reply = await this.#redis.eval(
      BEGIN_SCRIPT,
      1,
      `${this.#prefix}${key}`,
      JSON.stringify(pending),
      lockTtlMs,
    );
    if (reply === null) return null;
    if (typeof reply !== "string")
      throw new Error("respuesta inesperada del script de idempotencia");
    return RecordSchema.parse(JSON.parse(reply));
  }

  async complete(key: string, record: IdempotencyRecord & { state: "completed" }, ttlMs: number) {
    await this.#redis.set(`${this.#prefix}${key}`, JSON.stringify(record), "PX", ttlMs);
  }

  async release(key: string) {
    await this.#redis.del(`${this.#prefix}${key}`);
  }
}
