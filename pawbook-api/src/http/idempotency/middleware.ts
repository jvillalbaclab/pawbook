import { IdempotencyKeySchema } from "@pawbook/contracts";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "../../shared/errors";
import { withTimeout } from "../../shared/timeout";
import type { AppEnv } from "../types";
import type { IdempotencyStore, StoredResponse } from "./store";

/** Cabecera que marca una respuesta reproducida desde el almacén, no recién ejecutada. */
export const REPLAYED_HEADER = "Idempotent-Replayed";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Si el proceso muere a mitad de una solicitud, la reserva se libera sola tras este tiempo. */
const DEFAULT_LOCK_TTL_MS = 60_000;
const STORE_TIMEOUT_MS = 500;
/** Cabeceras de la respuesta original que tiene sentido reproducir. */
const REPLAYED_RESPONSE_HEADERS = ["content-type", "location", "etag"];

/*
 * 4xx que dependen del momento o de las credenciales y no del cuerpo: reintentar puede dar
 * otro resultado, así que no se guardan (401/403 cambian al renovar sesión; 408, 409, 425 y
 * 429 son transitorios por definición).
 */
const TRANSIENT_CLIENT_ERRORS = new Set([401, 403, 408, 409, 425, 429]);

/**
 * Se guardan las 2xx y las 4xx deterministas. Las 5xx no: el cliente reintenta justamente
 * porque falló algo nuestro, y guardar el error lo haría permanente 24 h. Se libera la key
 * para que el reintento vuelva a ejecutar la operación; las escrituras van en transacción
 * (con outbox para Stream), así que un 5xx no deja la operación a medias.
 */
function isCacheable(status: number): boolean {
  if (status >= 200 && status < 300) return true;
  return status >= 400 && status < 500 && !TRANSIENT_CLIENT_ERRORS.has(status);
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function snapshot(response: Response): Promise<StoredResponse> {
  const headers: Record<string, string> = {};
  for (const name of REPLAYED_RESPONSE_HEADERS) {
    const value = response.headers.get(name);
    if (value !== null) headers[name] = value;
  }
  return { status: response.status, headers, body: await response.clone().text() };
}

function replay(c: Context<AppEnv>, stored: StoredResponse): Response {
  return c.body(stored.body, stored.status as ContentfulStatusCode, {
    ...stored.headers,
    [REPLAYED_HEADER]: "true",
  });
}

export type IdempotencyOptions = {
  readonly store: IdempotencyStore;
  /** Si es `true`, la cabecera es obligatoria (400 si falta). Por defecto es opcional. */
  readonly required?: boolean;
  readonly ttlMs?: number;
  readonly lockTtlMs?: number;
};

/**
 * `Idempotency-Key` para `POST` de creación (NFR-REL-001), opt-in por ruta. La key se aísla
 * por usuario (o IP si es anónimo), método y ruta: dos usuarios con la misma key no chocan.
 * - Misma key y mismo cuerpo: devuelve la respuesta original con `Idempotent-Replayed: true`.
 * - Misma key y otro cuerpo: 422.
 * - Misma key con la primera solicitud aún en curso: 409.
 * Si Valkey no responde se devuelve 503 (fail-closed): ejecutar sin garantía podría duplicar
 * la creación, y el cliente ya está preparado para reintentar con la misma key.
 */
export function idempotency(options: IdempotencyOptions) {
  const { store, required = false, ttlMs = DAY_MS, lockTtlMs = DEFAULT_LOCK_TTL_MS } = options;

  return createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header("idempotency-key");
    if (header === undefined) {
      if (required) {
        throw new AppError("bad-request", { detail: "Falta la cabecera Idempotency-Key." });
      }
      return next();
    }
    if (!IdempotencyKeySchema.safeParse(header).success) {
      throw new AppError("bad-request", {
        detail: "Idempotency-Key debe tener entre 1 y 255 caracteres ASCII visibles, sin espacios.",
      });
    }

    const userId = c.get("userId");
    const subject = userId !== undefined ? `user:${userId}` : `ip:${c.get("clientIp")}`;
    const key = `${subject}:${c.req.method}:${c.req.path}:${header}`;
    // Hono cachea el cuerpo leído: el validador de la ruta puede volver a leerlo después.
    const fingerprint = await sha256Hex(await c.req.arrayBuffer());
    const logger = c.get("logger");

    let existing: Awaited<ReturnType<IdempotencyStore["begin"]>>;
    try {
      existing = await withTimeout(store.begin(key, fingerprint, lockTtlMs), STORE_TIMEOUT_MS);
    } catch (error) {
      logger.warn({ err: error }, "idempotency store unavailable");
      throw new AppError("service-unavailable", { cause: error });
    }

    if (existing !== null) {
      if (existing.fingerprint !== fingerprint) {
        throw new AppError("validation-failed", {
          detail:
            "Esta Idempotency-Key ya se usó con otros datos. Genera una nueva para otra operación.",
        });
      }
      if (existing.state === "in-progress") {
        throw new AppError("conflict", {
          detail:
            "Ya hay una solicitud en curso con esta Idempotency-Key. Reintenta en unos segundos.",
        });
      }
      return replay(c, existing.response);
    }

    await next();

    // Los errores lanzados por la ruta ya están convertidos en respuesta (onError) aquí.
    try {
      if (isCacheable(c.res.status)) {
        await store.complete(
          key,
          { state: "completed", fingerprint, response: await snapshot(c.res) },
          ttlMs,
        );
      } else {
        await store.release(key);
      }
    } catch (error) {
      // La operación ya se hizo: no se cambia la respuesta. La reserva caduca en `lockTtlMs`.
      logger.error({ err: error }, "idempotency store write failed");
    }
  });
}
