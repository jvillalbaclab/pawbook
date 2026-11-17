/*
 * `@handle` de la mascota (FR-PET-002): único en toda la plataforma, 3-30 caracteres de
 * `[a-z0-9_.]` y editable como máximo una vez cada 30 días. Se guarda siempre normalizado
 * (minúsculas), y la unicidad la garantiza un índice único sobre `lower(handle)` en Postgres.
 */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;
const HANDLE_PATTERN = /^[a-z0-9_.]{3,30}$/;
/** Además del SRS: al menos una letra o un dígito, para que `...` o `___` no sean handles. */
const HAS_ALPHANUMERIC = /[a-z0-9]/;

const DAY_MS = 24 * 60 * 60 * 1000;
export const HANDLE_CHANGE_COOLDOWN_MS = 30 * DAY_MS;

/*
 * Handles que nadie puede registrar: rutas de la web (`/ajustes`, `/explorar`...), cuentas de
 * sistema y nombres que permitirían suplantar al equipo. Cualquier handle que empiece por
 * `pawbook` también queda reservado.
 */
const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "about",
  "abuse",
  "admin",
  "administrator",
  "adopcion",
  "adopciones",
  "adoption",
  "ajustes",
  "api",
  "app",
  "ayuda",
  "buscar",
  "contacto",
  "equipo",
  "explorar",
  "explore",
  "feed",
  "help",
  "legal",
  "login",
  "mascota",
  "mascotas",
  "me",
  "mensajes",
  "messages",
  "moderacion",
  "moderador",
  "moderator",
  "notificaciones",
  "notifications",
  "null",
  "official",
  "oficial",
  "pawmates",
  "privacidad",
  "privacy",
  "registro",
  "root",
  "search",
  "security",
  "seguridad",
  "settings",
  "signup",
  "soporte",
  "staff",
  "stream",
  "support",
  "system",
  "team",
  "terminos",
  "terms",
  "undefined",
  "www",
]);

/** Quita espacios y una `@` inicial, y pasa a minúsculas: `@Luna.Gato` → `luna.gato`. */
export function normalizeHandle(raw: string): string {
  const trimmed = raw.trim();
  return (trimmed.startsWith("@") ? trimmed.slice(1) : trimmed).toLowerCase();
}

export type HandleProblem = "invalid" | "reserved";

/** Valida un handle ya normalizado. `null` si es aceptable (falta comprobar que esté libre). */
export function checkHandle(handle: string): HandleProblem | null {
  if (!HANDLE_PATTERN.test(handle) || !HAS_ALPHANUMERIC.test(handle)) return "invalid";
  if (RESERVED_HANDLES.has(handle) || handle.startsWith("pawbook")) return "reserved";
  return null;
}

/**
 * Momento a partir del cual se puede volver a cambiar el handle. El handle elegido al crear la
 * mascota no cuenta como cambio: el primer cambio está permitido enseguida (corregir una errata
 * del onboarding) y desde ahí rige el límite de uno cada 30 días.
 */
export function nextHandleChangeAt(handleChangedAt: Date | null): Date | null {
  return handleChangedAt === null
    ? null
    : new Date(handleChangedAt.getTime() + HANDLE_CHANGE_COOLDOWN_MS);
}

export function canChangeHandle(handleChangedAt: Date | null, now: Date): boolean {
  const next = nextHandleChangeAt(handleChangedAt);
  return next === null || now.getTime() >= next.getTime();
}
