import { type Clock, systemClock } from "../../shared/clock";

/** Respuesta guardada para reproducirla tal cual ante un reintento. */
export type StoredResponse = {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
};

/** Huella del cuerpo (SHA-256) con la que se detecta que se reutiliza la key con otros datos. */
export type IdempotencyRecord =
  | { readonly state: "in-progress"; readonly fingerprint: string }
  | {
      readonly state: "completed";
      readonly fingerprint: string;
      readonly response: StoredResponse;
    };

/**
 * Puerto del almacén de `Idempotency-Key` (NFR-REL-001).
 * - `begin` reserva la key de forma atómica. Devuelve `null` si la reserva es nuestra o el
 *   registro existente (otra solicitud en curso o una respuesta ya completada).
 * - `complete` sustituye la reserva por la respuesta final con su TTL.
 * - `release` borra la reserva para que el cliente pueda reintentar.
 */
export interface IdempotencyStore {
  begin(key: string, fingerprint: string, lockTtlMs: number): Promise<IdempotencyRecord | null>;
  complete(
    key: string,
    record: IdempotencyRecord & { state: "completed" },
    ttlMs: number,
  ): Promise<void>;
  release(key: string): Promise<void>;
}

/** Adaptador en memoria para tests: un solo proceso, sin persistencia. */
export class MemoryIdempotencyStore implements IdempotencyStore {
  readonly #records = new Map<string, { record: IdempotencyRecord; expiresAt: number }>();
  readonly #clock: Clock;

  constructor(clock: Clock = systemClock) {
    this.#clock = clock;
  }

  async begin(key: string, fingerprint: string, lockTtlMs: number) {
    const now = this.#clock.now().getTime();
    const existing = this.#records.get(key);
    if (existing !== undefined && existing.expiresAt > now) return existing.record;
    this.#records.set(key, {
      record: { state: "in-progress", fingerprint },
      expiresAt: now + lockTtlMs,
    });
    return null;
  }

  async complete(key: string, record: IdempotencyRecord & { state: "completed" }, ttlMs: number) {
    this.#records.set(key, { record, expiresAt: this.#clock.now().getTime() + ttlMs });
  }

  async release(key: string) {
    this.#records.delete(key);
  }
}
