/*
 * Errores de aplicación con formato RFC 9457 (COM-003). Cada error conoce su estado HTTP
 * y un `type` estable que los clientes (web y móvil) pueden usar para decidir qué mostrar
 * sin depender del texto. El texto (`title`, `detail`) va en español para el usuario.
 */

const PROBLEM_TYPE_BASE = "https://pawbook.app/problems/";

export type ProblemCode =
  | "bad-request"
  | "validation-failed"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "rate-limited"
  | "service-unavailable"
  | "internal-error";

const DEFAULTS: Record<ProblemCode, { status: number; title: string }> = {
  "bad-request": { status: 400, title: "Solicitud incorrecta" },
  "validation-failed": { status: 422, title: "Los datos enviados no son válidos" },
  unauthorized: { status: 401, title: "Necesitas iniciar sesión" },
  forbidden: { status: 403, title: "No tienes permiso para hacer esto" },
  "not-found": { status: 404, title: "No encontramos lo que buscas" },
  conflict: { status: 409, title: "La solicitud entra en conflicto con el estado actual" },
  "rate-limited": { status: 429, title: "Demasiadas solicitudes" },
  "service-unavailable": { status: 503, title: "Servicio no disponible temporalmente" },
  "internal-error": { status: 500, title: "Algo salió mal en nuestro lado" },
};

export type FieldError = { readonly path: string; readonly message: string };

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  requestId?: string;
  errors?: FieldError[];
};

export class AppError extends Error {
  readonly code: ProblemCode;
  readonly status: number;
  readonly title: string;
  readonly detail: string | undefined;
  readonly errors: FieldError[] | undefined;

  constructor(
    code: ProblemCode,
    options: { detail?: string; errors?: FieldError[]; cause?: unknown } = {},
  ) {
    const defaults = DEFAULTS[code];
    super(options.detail ?? defaults.title, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = defaults.status;
    this.title = defaults.title;
    this.detail = options.detail;
    this.errors = options.errors;
  }
}

/**
 * Convierte cualquier error en un problem+json. Los errores desconocidos se reducen a un
 * 500 genérico: su mensaje interno nunca sale al cliente (puede llevar SQL o secretos).
 */
export function toProblem(
  error: unknown,
  context: { instance?: string; requestId?: string } = {},
): ProblemDetails {
  const appError = error instanceof AppError ? error : new AppError("internal-error");
  const problem: ProblemDetails = {
    type: `${PROBLEM_TYPE_BASE}${appError.code}`,
    title: appError.title,
    status: appError.status,
  };
  if (appError.detail !== undefined) problem.detail = appError.detail;
  if (appError.errors !== undefined) problem.errors = appError.errors;
  if (context.instance !== undefined) problem.instance = context.instance;
  if (context.requestId !== undefined) problem.requestId = context.requestId;
  return problem;
}
