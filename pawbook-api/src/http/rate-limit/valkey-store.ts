import type Redis from "ioredis";
import type { RateLimitHit, RateLimitStore } from "./store";

/*
 * INCR + PEXPIRE en un script Lua: Valkey lo ejecuta de forma atómica, así que varias
 * réplicas de la API comparten el contador sin carreras y en un solo viaje de red.
 * Si la clave ya existía sin caducidad (p. ej. un PEXPIRE perdido), se la vuelve a poner
 * para que un contador nunca quede bloqueado para siempre.
 */
const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { count, ttl }
`;

export class ValkeyRateLimitStore implements RateLimitStore {
  readonly #redis: Redis;
  readonly #prefix: string;

  /** `prefix` aísla las claves (p. ej. `ratelimit:` en producción, `test:http:` en tests). */
  constructor(redis: Redis, prefix = "ratelimit:") {
    this.#redis = redis;
    this.#prefix = prefix;
  }

  async hit(key: string, windowMs: number): Promise<RateLimitHit> {
    const reply = await this.#redis.eval(HIT_SCRIPT, 1, `${this.#prefix}${key}`, windowMs);
    if (!Array.isArray(reply) || typeof reply[0] !== "number" || typeof reply[1] !== "number") {
      throw new Error("respuesta inesperada del script de rate limit");
    }
    return { count: reply[0], resetInMs: reply[1] };
  }
}
