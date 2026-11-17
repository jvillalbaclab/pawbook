import { z } from "zod";

/*
 * Configuración leída y validada al arrancar. Si falta una variable, la API no arranca:
 * es mejor fallar en el despliegue que con la primera solicitud.
 */
const commaList = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.url(),
  VALKEY_URL: z.url(),
  CORS_ORIGINS: commaList,
  /*
   * Proxies de confianza delante de la API (balanceador, CDN). Con 0 se ignora
   * `X-Forwarded-For`, que el cliente puede falsificar; con N se toma la N-ésima IP desde la
   * derecha. Solo debe subirse si la API no es accesible saltándose esos proxies.
   */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),

  // --- identity (T-M0.25 a T-M0.31)
  /** Clave HS256 de los access tokens. Secreto: mínimo 32 caracteres aleatorios. */
  AUTH_ACCESS_TOKEN_SECRET: z.string().min(32),
  /*
   * Edad mínima de registro (FR-AUTH-001). PROVISIONAL: la fijan los socios con asesoría legal
   * (T-F0.02, PRD Q2: 14, 16 o 18). Por defecto 18, la opción más restrictiva de las tres,
   * para no admitir a nadie que luego quede fuera; bajarla no invalida cuentas existentes.
   */
  MIN_SIGNUP_AGE: z.coerce.number().int().min(13).max(21).default(18),
  /** Versión vigente de términos y privacidad que la web muestra y envía al registrarse. */
  TERMS_VERSION: z.string().min(1).max(64).default("2026-11-17"),
  /** URL de la web para los enlaces de los correos (verificación, recuperación). */
  WEB_APP_URL: z.url().default("http://localhost:3000"),
  /** `file`: escribe los correos en EMAIL_OUTBOX_DIR (desarrollo). `memory`: los descarta (tests). */
  EMAIL_TRANSPORT: z.enum(["file", "memory"]).default("file"),
  EMAIL_OUTBOX_DIR: z.string().min(1).default(".local/mail"),
  /** Client IDs OAuth de Google separados por comas. Vacío = login con Google deshabilitado. */
  GOOGLE_CLIENT_IDS: commaList,
  /** `hibp`: comprueba contraseñas filtradas con k-anonimato. `off`: sin comprobación (sin red). */
  PASSWORD_BREACH_CHECK: z.enum(["hibp", "off"]).default("hibp"),
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
