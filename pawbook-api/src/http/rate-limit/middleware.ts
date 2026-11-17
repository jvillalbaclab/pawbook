import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { AppError } from "../../shared/errors";
import { withTimeout } from "../../shared/timeout";
import type { AppEnv } from "../types";
import type { RateLimitHit, RateLimitStore } from "./store";

/** Límite de solicitudes por ventana. */
export type RateLimitPolicy = {
  /** Identifica el contador: dos grupos de rutas con el mismo nombre comparten cuota. */
  readonly name: string;
  readonly limit: number;
  readonly windowMs: number;
};

/** Límites por defecto de NFR-SEC-004. El de IA (FR-AI-002) es una cuota diaria aparte. */
export const RATE_LIMITS = {
  default: { name: "default", limit: 120, windowMs: 60_000 },
  auth: { name: "auth", limit: 10, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

/** Cabeceras que el navegador debe poder leer en respuestas CORS. */
export const RATE_LIMIT_EXPOSED_HEADERS = [
  "Retry-After",
  "RateLimit-Limit",
  "RateLimit-Remaining",
  "RateLimit-Reset",
  "RateLimit-Policy",
];

/** Tiempo máximo que esperamos a Valkey antes de aplicar el modo de fallo. */
const STORE_TIMEOUT_MS = 500;

export type RateLimitOptions = RateLimitPolicy & {
  readonly store: RateLimitStore;
  /**
   * Si Valkey no responde: `false` (por defecto) deja pasar la solicitud; `true` responde 503.
   * Fail-closed solo compensa donde el abuso es peor que la caída (p. ej. login por fuerza bruta).
   */
  readonly failClosed?: boolean;
  /** Rutas exentas (p. ej. sondas de salud, que el orquestador llama sin parar). */
  readonly skip?: (c: Context<AppEnv>) => boolean;
};

/** Clave del contador: el usuario si hay sesión, si no la IP. */
function subjectOf(c: Context<AppEnv>): string {
  const userId = c.get("userId");
  return userId !== undefined ? `user:${userId}` : `ip:${c.get("clientIp")}`;
}

/*
 * Cabeceras del draft IETF `RateLimit` header fields (formato -Limit/-Remaining/-Reset, el
 * más implementado por clientes y proxies) más `RateLimit-Policy` con la ventana en segundos.
 */
function setRateLimitHeaders(c: Context<AppEnv>, policy: RateLimitPolicy, hit: RateLimitHit) {
  const resetSeconds = Math.max(1, Math.ceil(hit.resetInMs / 1000));
  c.header("RateLimit-Limit", String(policy.limit));
  c.header("RateLimit-Remaining", String(Math.max(0, policy.limit - hit.count)));
  c.header("RateLimit-Reset", String(resetSeconds));
  c.header("RateLimit-Policy", `${policy.limit};w=${Math.ceil(policy.windowMs / 1000)}`);
  return resetSeconds;
}

/**
 * Rate limit de ventana fija sobre un contador compartido (NFR-SEC-004). Se monta por ruta o
 * grupo con su propia política. Al superar el límite responde 429 problem+json con
 * `Retry-After`.
 */
export function rateLimit(options: RateLimitOptions) {
  const { store, failClosed = false, skip, ...policy } = options;
  return createMiddleware<AppEnv>(async (c, next) => {
    if (skip?.(c)) return next();

    let hit: RateLimitHit;
    try {
      hit = await withTimeout(
        store.hit(`${policy.name}:${subjectOf(c)}`, policy.windowMs),
        STORE_TIMEOUT_MS,
      );
    } catch (error) {
      c.get("logger").warn(
        { err: error, policy: policy.name, failClosed },
        "rate limit store unavailable",
      );
      if (failClosed) throw new AppError("service-unavailable");
      return next();
    }

    const resetSeconds = setRateLimitHeaders(c, policy, hit);
    if (hit.count > policy.limit) {
      c.header("Retry-After", String(resetSeconds));
      throw new AppError("rate-limited", {
        detail: `Has superado el límite de solicitudes. Vuelve a intentarlo en ${resetSeconds} s.`,
      });
    }
    await next();
  });
}
