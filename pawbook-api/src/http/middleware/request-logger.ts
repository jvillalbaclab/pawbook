import { createMiddleware } from "hono/factory";
import type { Logger } from "pino";
import type { AppEnv } from "../types";

/*
 * Un log JSON por solicitud con su `requestId` (NFR-OBS-001). Se registra la ruta sin
 * query string: parámetros como `?q=` pueden contener datos personales (NFR-OBS-002).
 * El logger hijo queda en el contexto para que los casos de uso registren con el mismo ID.
 */
export function requestLogger(root: Logger) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const startedAt = performance.now();
    const logger = root.child({ requestId: c.get("requestId") });
    c.set("logger", logger);

    await next();

    const status = c.res.status;
    const entry = {
      method: c.req.method,
      path: c.req.path,
      status,
      durationMs: Math.round(performance.now() - startedAt),
    };
    // 503 es degradación esperada (p. ej. /ready mientras una dependencia arranca): no es un fallo nuestro.
    if (status === 503) logger.warn(entry, "request unavailable");
    else if (status >= 500) logger.error(entry, "request failed");
    else logger.info(entry, "request completed");
  });
}
