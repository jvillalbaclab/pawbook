import { z } from "zod";

/*
 * Configuración leída y validada al arrancar. Si falta una variable, la API no arranca:
 * es mejor fallar en el despliegue que con la primera solicitud.
 */
const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.url(),
  VALKEY_URL: z.url(),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    // Solo nombres de variables, nunca sus valores: pueden ser secretos.
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Configuración inválida en: ${fields}`);
  }
  return parsed.data;
}
