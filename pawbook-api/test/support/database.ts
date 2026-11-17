import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { createDatabase, type Database } from "../../src/infrastructure/db/database";
import { runMigrations } from "../../src/infrastructure/db/migrate";

/*
 * Base de datos propia de los tests de integración: se deriva de DATABASE_URL cambiando solo
 * el nombre de la BD, para no tocar nunca los datos de desarrollo (`pawbook`). Cada suite
 * puede usar la suya (p. ej. `pawbook_test_identity`) para no pisarse al truncar tablas.
 */
const DEFAULT_TEST_DATABASE = "pawbook_test_platform";
const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../migrations", import.meta.url));

export type TestDatabase = {
  url: string;
  sql: postgres.Sql;
  db: Database;
  close(): Promise<void>;
};

function databaseUrl(name: string): string {
  const base = process.env.DATABASE_URL;
  if (base === undefined || base === "") {
    throw new Error("Los tests de integración necesitan DATABASE_URL (ver .env.example)");
  }
  const url = new URL(base);
  url.pathname = `/${name}`;
  return url.toString();
}

async function ensureDatabaseExists(name: string): Promise<void> {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`Nombre de BD de tests inválido: ${name}`);
  // La BD de mantenimiento `postgres` solo se usa para el CREATE DATABASE.
  const admin = postgres(databaseUrl("postgres"), { max: 1, onnotice: () => {} });
  try {
    const existing = await admin`select 1 from pg_database where datname = ${name}`;
    if (existing.length === 0) {
      await admin.unsafe(`create database ${name}`).catch((error: unknown) => {
        // 42P04 = duplicate_database: otro proceso de tests la creó a la vez.
        if ((error as { code?: string }).code !== "42P04") throw error;
      });
    }
  } finally {
    await admin.end({ timeout: 5 });
  }
}

export async function setupTestDatabase(name = DEFAULT_TEST_DATABASE): Promise<TestDatabase> {
  await ensureDatabaseExists(name);
  const url = databaseUrl(name);
  await runMigrations(url, MIGRATIONS_FOLDER);
  const sql = postgres(url, { max: 10, onnotice: () => {} });
  return {
    url,
    sql,
    db: createDatabase(sql),
    close: () => sql.end({ timeout: 5 }),
  };
}

export async function resetPlatformTables(sql: postgres.Sql): Promise<void> {
  await sql`truncate platform.outbox, platform.inbox_events`;
}
