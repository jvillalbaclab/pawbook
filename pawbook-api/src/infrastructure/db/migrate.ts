import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { createDatabase } from "./database";

/**
 * Aplica las migraciones SQL versionadas de `migrations/` (generadas con drizzle-kit). Usa
 * `postgres-js`, así que funciona igual en Bun y en Node 22. Es idempotente: las ya aplicadas
 * quedan registradas en `drizzle.__drizzle_migrations` y no se repiten.
 */
export async function runMigrations(databaseUrl: string, migrationsFolder: string): Promise<void> {
  // Conexión propia y única: las migraciones no compiten con el pool de la aplicación.
  // `onnotice` silencia los avisos de Postgres del tipo "schema ... already exists, skipping".
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await migrate(createDatabase(sql), { migrationsFolder });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
