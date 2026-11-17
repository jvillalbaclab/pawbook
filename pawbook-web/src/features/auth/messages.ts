import { type ApiError, isApiError } from "@/lib/api-client/problem";
import { type FieldErrorCode, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./validation";

/*
 * Texto de cada error de los formularios de acceso: claves del namespace "auth" del
 * catálogo. Los errores de la API se eligen por el `type` del problem, nunca por su texto,
 * y ninguno distingue si un correo tiene cuenta (sin enumeración de cuentas).
 */

export const FIELD_ERROR_KEYS = {
  "email-invalid": "fieldErrors.emailInvalid",
  "password-required": "fieldErrors.passwordRequired",
  "password-too-short": "fieldErrors.passwordTooShort",
  "password-too-long": "fieldErrors.passwordTooLong",
  "passwords-mismatch": "fieldErrors.passwordsMismatch",
  "birth-date-invalid": "fieldErrors.birthDateInvalid",
  "terms-required": "fieldErrors.termsRequired",
} as const satisfies Record<FieldErrorCode, string>;

/** Valores de interpolación que usan los mensajes de campo. */
export const FIELD_ERROR_VALUES = { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH };

export type ProblemMessageKey =
  | "problems.network"
  | "problems.rateLimited"
  | "problems.rateLimitedWait"
  | "problems.invalidCredentials"
  | "problems.validation"
  | "problems.invalidLink"
  | "problems.linkExpired"
  | "problems.providerDisabled"
  | "problems.unavailable"
  | "problems.generic";

export type ProblemMessage = { key: ProblemMessageKey; values?: { seconds: number } };

/**
 * Mensaje general de un error de la API. `unauthorized` solo se traduce como credenciales
 * incorrectas en el login; en el resto de pantallas es un error genérico.
 */
export function problemMessage(error: unknown, context: "sign-in" | "default" = "default") {
  if (!isApiError(error)) return { key: "problems.generic" } satisfies ProblemMessage;
  return messageFor(error, context);
}

function messageFor(error: ApiError, context: "sign-in" | "default"): ProblemMessage {
  switch (error.code) {
    case "network-error":
      return { key: "problems.network" };
    case "rate-limited":
      return error.retryAfterSeconds === undefined
        ? { key: "problems.rateLimited" }
        : { key: "problems.rateLimitedWait", values: { seconds: error.retryAfterSeconds } };
    case "unauthorized":
      return context === "sign-in"
        ? { key: "problems.invalidCredentials" }
        : { key: "problems.generic" };
    case "validation-failed":
      return { key: "problems.validation" };
    case "invalid-link":
      return { key: "problems.invalidLink" };
    case "link-expired":
      return { key: "problems.linkExpired" };
    case "auth-provider-disabled":
      return { key: "problems.providerDisabled" };
    case "service-unavailable":
      return { key: "problems.unavailable" };
    default:
      return { key: "problems.generic" };
  }
}

/**
 * Errores por campo que devuelve la API (`errors[]` de un 422), con su texto. Se traducen
 * las rutas del contrato a los campos del formulario (p. ej. `termsVersion` → casilla de
 * términos). Las rutas que el formulario no pinta se ignoran: queda el mensaje general.
 */
export function apiFieldErrors<Field extends string>(
  error: unknown,
  fieldOf: Readonly<Record<string, Field>>,
): Partial<Record<Field, string>> {
  if (!isApiError(error)) return {};
  const fields: Partial<Record<Field, string>> = {};
  for (const [path, message] of Object.entries(error.fieldErrors)) {
    const field = fieldOf[path];
    if (field !== undefined && fields[field] === undefined) fields[field] = message;
  }
  return fields;
}
