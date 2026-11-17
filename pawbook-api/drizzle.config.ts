import { defineConfig } from "drizzle-kit";

/*
 * drizzle-kit solo genera las migraciones SQL (`bun run db:generate`); se aplican con
 * `bun run db:migrate` (src/main.migrate.ts), que funciona también en Node 22.
 * Cada módulo declara sus tablas en `modules/<módulo>/infrastructure/schema.ts`.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/infrastructure/db/schema/*.ts", "./src/modules/*/infrastructure/schema.ts"],
  out: "./migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
