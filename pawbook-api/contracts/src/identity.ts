import { z } from "@hono/zod-openapi";
import { pageSchema } from "./pagination";

/*
 * Contrato de identidad: `/v1/auth/*` y `/v1/me` (arquitectura §4.5). Web y móvil autentican
 * con `Authorization: Bearer <accessToken>` (COM-002); la web puede pedir además que el refresh
 * token viaje en una cookie `HttpOnly; Secure; SameSite=Lax` en vez de en el cuerpo.
 */

/** Longitudes de contraseña (FR-AUTH-001: mínimo 10). El máximo evita abusar del hash. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const EmailSchema = z
  .email()
  .max(254)
  .openapi({ description: "Correo electrónico.", example: "ana@example.com" });

export const PasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(PASSWORD_MAX_LENGTH, `Debe tener como máximo ${PASSWORD_MAX_LENGTH} caracteres`)
  .openapi({
    description: `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres. Se rechaza si aparece en listas de contraseñas filtradas.`,
    example: "una frase larga y propia",
  });

/** Fecha de calendario `AAAA-MM-DD`, sin hora ni zona. */
export const BirthDateSchema = z.iso.date().openapi({
  description: "Fecha de nacimiento (AAAA-MM-DD). Debe cumplir la edad mínima de registro.",
  example: "1995-04-23",
});

export const TermsVersionSchema = z.string().min(1).max(64).openapi({
  description:
    "Versión de los términos y la política de privacidad que el usuario acepta (OR-LEG-001). Debe ser la vigente.",
  example: "2026-11-17",
});

/** Dónde entrega la API el refresh token: en el cuerpo (móvil) o en una cookie HttpOnly (web). */
export const RefreshTokenDeliverySchema = z.enum(["body", "cookie"]).default("body").openapi({
  description:
    "`body` (por defecto, móvil): el refresh token va en la respuesta. `cookie` (web): va en una cookie `HttpOnly; Secure; SameSite=Lax` y `refreshToken` es `null`.",
});

export const SignUpRequestSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    birthDate: BirthDateSchema,
    termsVersion: TermsVersionSchema,
  })
  .openapi("SignUpRequest");

/**
 * Respuesta uniforme del registro: es la misma exista o no el correo, para no permitir
 * enumerar cuentas (arquitectura §9). El cliente continúa con `POST /v1/auth/sign-in`.
 */
export const SignUpResponseSchema = z
  .object({
    status: z.literal("verification-pending"),
    message: z.string(),
  })
  .openapi("SignUpResponse");

export const SignInRequestSchema = z
  .object({
    email: EmailSchema,
    // En el login no se aplica la política: solo se compara con lo guardado.
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
    refreshTokenDelivery: RefreshTokenDeliverySchema,
  })
  .openapi("SignInRequest");

export const GoogleSignInRequestSchema = z
  .object({
    idToken: z.string().min(1).max(4096).openapi({
      description: "ID token (JWT) obtenido de Google Identity Services.",
    }),
    birthDate: BirthDateSchema.optional().openapi({
      description: "Obligatoria solo si la cuenta no existe todavía.",
    }),
    termsVersion: TermsVersionSchema.optional().openapi({
      description: "Obligatoria solo si la cuenta no existe todavía.",
    }),
    refreshTokenDelivery: RefreshTokenDeliverySchema,
  })
  .openapi("GoogleSignInRequest");

export const RefreshRequestSchema = z
  .object({
    refreshToken: z.string().min(1).max(256).optional().openapi({
      description: "Obligatorio si no se envía la cookie de refresh (clientes móviles).",
    }),
  })
  .openapi("RefreshRequest");

export const SignOutRequestSchema = RefreshRequestSchema.openapi("SignOutRequest");

export const VerifyEmailRequestSchema = z
  .object({ token: z.string().min(1).max(256) })
  .openapi("VerifyEmailRequest");

export const VerifyEmailResponseSchema = z
  .object({ status: z.literal("verified") })
  .openapi("VerifyEmailResponse");

export const ForgotPasswordRequestSchema = z
  .object({ email: EmailSchema })
  .openapi("ForgotPasswordRequest");

/** Respuesta uniforme: no revela si el correo tiene cuenta (FR-AUTH-005). */
export const ForgotPasswordResponseSchema = z
  .object({ status: z.literal("accepted"), message: z.string() })
  .openapi("ForgotPasswordResponse");

export const ResetPasswordRequestSchema = z
  .object({ token: z.string().min(1).max(256), newPassword: PasswordSchema })
  .openapi("ResetPasswordRequest");

export const MeSchema = z
  .object({
    id: z.uuid(),
    email: EmailSchema,
    status: z.enum(["pending_verification", "active"]).openapi({
      description: "`pending_verification` hasta verificar el correo (FR-AUTH-001/002).",
    }),
    emailVerified: z.boolean(),
    birthDate: BirthDateSchema,
    createdAt: z.iso.datetime(),
    termsAcceptance: z
      .object({ version: z.string(), acceptedAt: z.iso.datetime() })
      .nullable()
      .openapi({ description: "Última aceptación registrada de los términos (OR-LEG-001)." }),
  })
  .openapi("Me");

export const AuthSessionSchema = z
  .object({
    tokenType: z.literal("Bearer"),
    accessToken: z.string().openapi({ description: "JWT para `Authorization: Bearer`." }),
    expiresIn: z.number().int().openapi({
      description: "Segundos de vida del access token (15 min).",
      example: 900,
    }),
    accessTokenExpiresAt: z.iso.datetime(),
    refreshToken: z.string().nullable().openapi({
      description:
        "Refresh token rotatorio de un solo uso. `null` si se entregó en cookie. Reutilizar uno ya usado revoca toda la sesión (FR-AUTH-004).",
    }),
    refreshTokenExpiresAt: z.iso.datetime(),
    user: MeSchema,
  })
  .openapi("AuthSession");

export const GoogleSignInResponseSchema = AuthSessionSchema.extend({
  isNewUser: z.boolean(),
}).openapi("GoogleSignInResponse");

export const SessionSchema = z
  .object({
    id: z.uuid(),
    createdAt: z.iso.datetime(),
    lastUsedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    userAgent: z.string().nullable(),
    current: z.boolean().openapi({ description: "`true` si es la sesión de este access token." }),
  })
  .openapi("Session");

export const SessionPageSchema = pageSchema(SessionSchema).openapi("SessionPage");

export const SessionIdParamSchema = z.object({
  id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});

export type SignUpRequest = z.infer<typeof SignUpRequestSchema>;
export type SignInRequest = z.infer<typeof SignInRequestSchema>;
export type GoogleSignInRequest = z.infer<typeof GoogleSignInRequestSchema>;
export type AuthSession = z.infer<typeof AuthSessionSchema>;
export type GoogleSignInResponse = z.infer<typeof GoogleSignInResponseSchema>;
export type Me = z.infer<typeof MeSchema>;
export type Session = z.infer<typeof SessionSchema>;
