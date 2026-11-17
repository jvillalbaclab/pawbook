import { type Clock, systemClock } from "../../shared/clock";

/** Estado de un contador tras registrar una solicitud. */
export type RateLimitHit = {
  /** Solicitudes contadas en la ventana actual, incluida esta. */
  readonly count: number;
  /** Milisegundos hasta que la ventana se reinicia. */
  readonly resetInMs: number;
};

/**
 * Puerto del contador de rate limit (ventana fija). `hit` incrementa de forma atómica el
 * contador de `key` y, si es la primera solicitud de la ventana, fija su caducidad.
 */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<RateLimitHit>;
}

/** Adaptador en memoria para tests: un solo proceso, sin persistencia. */
export class MemoryRateLimitStore implements RateLimitStore {
  readonly #counters = new Map<string, { count: number; expiresAt: number }>();
  readonly #clock: Clock;

  constructor(clock: Clock = systemClock) {
    this.#clock = clock;
  }

  async hit(key: string, windowMs: number): Promise<RateLimitHit> {
    const now = this.#clock.now().getTime();
    const current = this.#counters.get(key);
    const counter =
      current === undefined || current.expiresAt <= now
        ? { count: 0, expiresAt: now + windowMs }
        : current;
    counter.count += 1;
    this.#counters.set(key, counter);
    return { count: counter.count, resetInMs: counter.expiresAt - now };
  }
}
