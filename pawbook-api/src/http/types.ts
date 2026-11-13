import type { Logger } from "pino";

/** Variables que los middlewares dejan en el contexto de cada solicitud. */
export type AppEnv = {
  Variables: {
    requestId: string;
    logger: Logger;
  };
};

/**
 * Dependencia que debe responder para que la instancia reciba tráfico (Postgres, Valkey...).
 * `check` lanza si la dependencia no está disponible.
 */
export type ReadinessCheck = {
  readonly name: string;
  check(): Promise<void>;
};
