import type { StreamTokenResponse } from "@pawbook/contracts";
import { isApiError } from "@/lib/api-client/problem";

/*
 * Conexión en tiempo real con GetStream (arquitectura §5.3, ADR-002). Feeds se conecta como la
 * mascota activa (`pet_<id>`) y Chat como la persona (`usr_<id>`), así que al cambiar de
 * mascota se piden tokens nuevos con su `X-Pet-Id` y se reconecta Feeds.
 *
 * Todavía no hay SDK de Stream en la web (llega en M1 con el spike): esta capa pide los
 * tokens, los guarda SOLO en memoria, programa su renovación antes de `expiresAt` y llama a un
 * `StreamConnector` que hoy no hace nada. El SDK se enchufa ahí sin tocar el resto.
 *
 * Cambios rápidos de mascota: gana la última elección. Cada cambio abre una "generación"
 * nueva, aborta la solicitud anterior y descarta cualquier respuesta de una generación vieja.
 * Las llamadas al conector se encadenan en orden, así un `connect` lento de la mascota
 * anterior nunca queda por encima del `disconnect`/`connect` de la nueva.
 */

export type StreamTokens = StreamTokenResponse;

/** Punto de extensión para el SDK de Stream (M1). */
export type StreamConnector = {
  /**
   * Conecta (o actualiza los tokens de) la sesión de Stream. Se llama al elegir mascota y en
   * cada renovación con los tokens nuevos de la MISMA mascota.
   */
  connect: (tokens: StreamTokens) => void | Promise<void>;
  /** Desconecta: al cambiar de mascota (antes del nuevo `connect`) y al cerrar sesión. */
  disconnect: () => void | Promise<void>;
};

/** Conector de M0: no hay SDK todavía. */
export const noopConnector: StreamConnector = {
  connect: () => {},
  disconnect: () => {},
};

export type StreamSessionOptions = {
  requestTokens: (petId: string, signal: AbortSignal) => Promise<StreamTokens>;
  connector?: StreamConnector;
  now?: () => number;
  /** Programa `work` dentro de `ms`; devuelve la cancelación. */
  schedule?: (work: () => void, ms: number) => () => void;
  /** Cuánto antes de `expiresAt` se renuevan los tokens. */
  renewBeforeMs?: number;
  /** Primera espera tras un fallo recuperable; se duplica hasta `maxRetryDelayMs`. */
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  onError?: (error: unknown) => void;
};

export const RENEW_BEFORE_MS = 5 * 60_000;
/** Nunca se programa una renovación antes de esto (evita bucles con relojes desajustados). */
const MIN_RENEW_DELAY_MS = 10_000;

const defaultSchedule = (work: () => void, ms: number) => {
  const timer = setTimeout(work, ms);
  return () => clearTimeout(timer);
};

/** Fallos que merece la pena reintentar: red, 429 y errores del servidor. Un 4xx, no. */
function isRetryable(error: unknown): boolean {
  if (!isApiError(error)) return true;
  return error.status === 0 || error.status === 429 || error.status >= 500;
}

export function createStreamSession(options: StreamSessionOptions) {
  const connector = options.connector ?? noopConnector;
  const now = options.now ?? Date.now;
  const schedule = options.schedule ?? defaultSchedule;
  const renewBeforeMs = options.renewBeforeMs ?? RENEW_BEFORE_MS;
  const retryDelayMs = options.retryDelayMs ?? 15_000;
  const maxRetryDelayMs = options.maxRetryDelayMs ?? 5 * 60_000;

  let generation = 0;
  let petId: string | null = null;
  let tokens: StreamTokens | null = null;
  let connected = false;
  let inFlight: AbortController | null = null;
  let cancelTimer: (() => void) | null = null;
  let connectorQueue: Promise<void> = Promise.resolve();

  function enqueue(operation: () => void | Promise<void>): void {
    connectorQueue = connectorQueue.then(operation).catch((error: unknown) => {
      options.onError?.(error);
    });
  }

  function stopPending(): void {
    inFlight?.abort();
    inFlight = null;
    cancelTimer?.();
    cancelTimer = null;
  }

  async function obtain(current: number, target: string, attempt: number): Promise<void> {
    const controller = new AbortController();
    inFlight = controller;
    let next: StreamTokens;
    try {
      next = await options.requestTokens(target, controller.signal);
    } catch (error) {
      if (current !== generation) return; // otra mascota ya tomó el relevo
      inFlight = null;
      options.onError?.(error);
      if (isRetryable(error)) {
        const delay = Math.min(retryDelayMs * 2 ** attempt, maxRetryDelayMs);
        cancelTimer = schedule(() => void obtain(current, target, attempt + 1), delay);
      }
      return;
    }
    if (current !== generation) return;
    inFlight = null;
    tokens = next;
    connected = true;
    enqueue(() => connector.connect(next));
    const expiresAt = Date.parse(next.expiresAt);
    const delay = Math.max(MIN_RENEW_DELAY_MS, expiresAt - renewBeforeMs - now());
    cancelTimer = schedule(() => void obtain(current, target, 0), delay);
  }

  return {
    /**
     * Fija la mascota activa (`null` al cerrar sesión o sin mascotas). Repetir la misma no
     * hace nada; cambiarla desconecta la anterior y pide tokens para la nueva.
     */
    setActivePet(next: string | null): void {
      if (next === petId) return;
      generation += 1;
      petId = next;
      tokens = null;
      stopPending();
      if (connected) {
        connected = false;
        enqueue(() => connector.disconnect());
      }
      if (next !== null) void obtain(generation, next, 0);
    },

    /** Mascota y tokens vigentes (solo en memoria). */
    snapshot(): { petId: string | null; tokens: StreamTokens | null } {
      return { petId, tokens };
    },

    /** Espera a que el conector termine lo que tiene encolado (para tests). */
    idle(): Promise<void> {
      return connectorQueue;
    },
  };
}

export type StreamSession = ReturnType<typeof createStreamSession>;
