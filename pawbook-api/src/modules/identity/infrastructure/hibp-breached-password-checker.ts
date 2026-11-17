import type { BreachedPasswordChecker } from "../application/ports";

/*
 * Comprobación contra Have I Been Pwned (FR-AUTH-001, ASVS 2.1.7) con k-anonimato: solo se
 * envían los 5 primeros caracteres del SHA-1 y la comparación se hace aquí, así la contraseña
 * (ni su hash completo) nunca sale del servidor. `Add-Padding` evita que el tamaño de la
 * respuesta delate el prefijo.
 *
 * Si HIBP no responde a tiempo, se deja pasar (fail-open): no se bloquea el registro de
 * todos los usuarios por un servicio externo. El fallo se informa para poder alertar.
 */
const RANGE_URL = "https://api.pwnedpasswords.com/range/";
const DEFAULT_TIMEOUT_MS = 2_000;

export type HibpOptions = {
  readonly timeoutMs?: number;
  readonly fetch?: typeof fetch;
  readonly onUnavailable?: (error: unknown) => void;
};

async function sha1Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Buffer.from(digest).toString("hex").toUpperCase();
}

export class HibpBreachedPasswordChecker implements BreachedPasswordChecker {
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;
  readonly #onUnavailable: (error: unknown) => void;

  constructor(options: HibpOptions = {}) {
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#fetch = options.fetch ?? fetch;
    this.#onUnavailable = options.onUnavailable ?? (() => {});
  }

  async isBreached(password: string): Promise<boolean> {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    try {
      const response = await this.#fetch(`${RANGE_URL}${prefix}`, {
        headers: { "Add-Padding": "true", "User-Agent": "pawbook-api" },
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
      if (!response.ok) throw new Error(`HIBP respondió ${response.status}`);
      const body = await response.text();
      return body.split("\n").some((line) => {
        const [candidate, count] = line.trim().split(":");
        // Las entradas de relleno llevan contador 0.
        return candidate === suffix && Number(count) > 0;
      });
    } catch (error) {
      this.#onUnavailable(error);
      return false;
    }
  }
}

/** Para desarrollo sin red y para tests: rechaza solo las contraseñas de la lista. */
export class StaticBreachedPasswordChecker implements BreachedPasswordChecker {
  readonly #breached: ReadonlySet<string>;

  constructor(breached: Iterable<string> = []) {
    this.#breached = new Set(breached);
  }

  async isBreached(password: string): Promise<boolean> {
    return this.#breached.has(password);
  }
}
