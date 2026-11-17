import type { Problem } from "@pawbook/contracts";

/*
 * Errores de la API (RFC 9457, COM-003). La interfaz decide qué mostrar por el `type`
 * estable del problem, nunca por el texto; los errores por campo (`errors[]`) se pintan
 * junto a cada campo del formulario.
 */

const PROBLEM_TYPE_BASE = "https://pawbook.app/problems/";

/** Códigos de problem que la web distingue. Cualquier otro se trata como `unknown`. */
export const PROBLEM_CODES = [
  "bad-request",
  "validation-failed",
  "unauthorized",
  "forbidden",
  "email-not-verified",
  "not-found",
  "conflict",
  "invalid-link",
  "link-expired",
  "rate-limited",
  "service-unavailable",
  "auth-provider-disabled",
  "internal-error",
] as const;

export type ProblemCode = (typeof PROBLEM_CODES)[number] | "network-error" | "unknown";

export type FieldErrors = Readonly<Record<string, string>>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: ProblemCode;
  readonly detail: string | undefined;
  /** Primer mensaje de cada campo, por ruta (`"email"`, `"birthDate"`…). */
  readonly fieldErrors: FieldErrors;
  /** Segundos de `Retry-After` en un 429, si la API lo indica. */
  readonly retryAfterSeconds: number | undefined;

  constructor(options: {
    status: number;
    code: ProblemCode;
    detail?: string;
    fieldErrors?: FieldErrors;
    retryAfterSeconds?: number;
  }) {
    super(options.detail ?? options.code);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.detail = options.detail;
    this.fieldErrors = options.fieldErrors ?? {};
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** `https://pawbook.app/problems/link-expired` → `link-expired`. */
export function problemCodeOf(type: unknown): ProblemCode {
  if (typeof type !== "string" || !type.startsWith(PROBLEM_TYPE_BASE)) return "unknown";
  const code = type.slice(PROBLEM_TYPE_BASE.length);
  return (PROBLEM_CODES as readonly string[]).includes(code) ? (code as ProblemCode) : "unknown";
}

/** `Retry-After` en segundos (RFC 9110: segundos o fecha HTTP). */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - now) / 1000));
}

function isProblemLike(body: unknown): body is Partial<Problem> {
  return typeof body === "object" && body !== null;
}

/** Convierte una respuesta de error (y su cuerpo ya leído) en un `ApiError`. */
export function toApiError(response: Response, body: unknown): ApiError {
  const problem = isProblemLike(body) ? body : {};
  const fieldErrors: Record<string, string> = {};
  for (const error of problem.errors ?? []) {
    if (typeof error?.path === "string" && !(error.path in fieldErrors)) {
      fieldErrors[error.path] = error.message;
    }
  }
  const code =
    problem.type === undefined
      ? response.status === 429
        ? "rate-limited"
        : "unknown"
      : problemCodeOf(problem.type);
  return new ApiError({
    status: response.status,
    code,
    ...(typeof problem.detail === "string" ? { detail: problem.detail } : {}),
    fieldErrors,
    ...(response.status === 429
      ? { retryAfterSeconds: parseRetryAfter(response.headers.get("Retry-After")) }
      : {}),
  });
}

/** Error de red (sin respuesta de la API: sin conexión, CORS, DNS…). */
export function networkError(cause: unknown): ApiError {
  const error = new ApiError({ status: 0, code: "network-error" });
  error.cause = cause;
  return error;
}
