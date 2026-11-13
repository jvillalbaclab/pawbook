import Redis from "ioredis";
import pino, { type Logger } from "pino";
import postgres from "postgres";
import type { ReadinessCheck } from "../http/types";
import type { Config } from "./config";

/*
 * Wiring de puertos → adaptadores. Es el único sitio que conoce los clientes concretos de
 * Postgres y Valkey; el resto del código recibe lo que necesita por parámetro.
 */
export type Container = {
  config: Config;
  logger: Logger;
  sql: postgres.Sql;
  valkey: Redis;
  readinessChecks: ReadinessCheck[];
  close(): Promise<void>;
};

export function createContainer(config: Config): Container {
  const logger = pino({
    level: config.LOG_LEVEL,
    base: { service: "pawbook-api" },
    // Defensa en profundidad: aunque alguien registre una cabecera, no sale el secreto.
    redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token"],
  });

  const sql = postgres(config.DATABASE_URL, { max: 10, connect_timeout: 5, idle_timeout: 30 });

  const valkey = new Redis(config.VALKEY_URL, {
    lazyConnect: true,
    connectTimeout: 2_000,
    maxRetriesPerRequest: 1,
  });
  valkey.on("error", (error) => logger.warn({ err: error }, "valkey connection error"));

  const readinessChecks: ReadinessCheck[] = [
    {
      name: "postgres",
      check: async () => {
        await sql`select 1`;
      },
    },
    {
      name: "valkey",
      check: async () => {
        if (valkey.status === "wait") await valkey.connect();
        await valkey.ping();
      },
    },
  ];

  return {
    config,
    logger,
    sql,
    valkey,
    readinessChecks,
    close: async () => {
      await Promise.allSettled([sql.end({ timeout: 5 }), valkey.quit()]);
    },
  };
}
