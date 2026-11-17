import { fileURLToPath } from "node:url";
import { runMigrations } from "./infrastructure/db/migrate";

/*
 * Entrypoint de migraciones: `bun run db:migrate` en desarrollo, `node dist/main.migrate.js`
 * en el despliegue (antes de arrancar API y worker). `../migrations` resuelve igual desde
 * `src/` que desde `dist/`.
 */
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl === "") {
  console.error("Falta la variable DATABASE_URL");
  process.exit(1);
}

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));
await runMigrations(databaseUrl, migrationsFolder);
console.log("Migraciones aplicadas");
