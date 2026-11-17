import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  AuthSessionSchema,
  ForgotPasswordRequestSchema,
  ForgotPasswordResponseSchema,
  GoogleSignInRequestSchema,
  GoogleSignInResponseSchema,
  IdempotencyHeadersSchema,
  MeSchema,
  PaginationQuerySchema,
  ProblemSchema,
  RefreshRequestSchema,
  ResetPasswordRequestSchema,
  SessionIdParamSchema,
  SessionPageSchema,
  SignInRequestSchema,
  SignOutRequestSchema,
  SignUpRequestSchema,
  SignUpResponseSchema,
  VerifyEmailRequestSchema,
  VerifyEmailResponseSchema,
} from "@pawbook/contracts";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { idempotency } from "../../../http/idempotency/middleware";
import type { IdempotencyStore } from "../../../http/idempotency/store";
import { authenticatedUser, requireAuth } from "../../../http/middleware/auth";
import { RATE_LIMITS, rateLimit } from "../../../http/rate-limit/middleware";
import type { RateLimitStore } from "../../../http/rate-limit/store";
import type { AppEnv } from "../../../http/types";
import { AppError, type FieldError } from "../../../shared/errors";
import type { Uuid } from "../../../shared/ids";
import { type AccountView, getAccount } from "../application/account";
import { type GoogleSignInError, googleSignIn, signIn } from "../application/authentication";
import { requestPasswordReset, resetPassword } from "../application/password-recovery";
import type { IdentityDeps } from "../application/ports";
import {
  type RegistrationDataError,
  resendVerification,
  signUp,
  verifyEmail,
} from "../application/registration";
import {
  type IssuedSession,
  listSessions,
  refreshSession,
  revokeSession,
  signOut,
} from "../application/sessions";
import { ACCESS_TOKEN_TTL_MS } from "../domain/session";
import { userStatus } from "../domain/user";

/*
 * Rutas de identity bajo /v1 (arquitectura §4.5). Validan con los esquemas de
 * @pawbook/contracts, llaman a los casos de uso y traducen sus resultados a HTTP.
 */

export type IdentityRoutesOptions = {
  readonly identity: IdentityDeps;
  readonly rateLimitStore: RateLimitStore;
  readonly idempotencyStore: IdempotencyStore;
  /**
   * Duración mínima de las respuestas de registro y recuperación: iguala el tiempo exista o
   * no el correo (arquitectura §9). Los tests la bajan para ir rápido.
   */
  readonly uniformResponseMs?: number;
};

const DEFAULT_UNIFORM_RESPONSE_MS = 400;

/** Cookie del refresh token para la web: solo viaja a /v1/auth (COM-002). */
export const REFRESH_COOKIE = "__Secure-pawbook-refresh";
const REFRESH_COOKIE_PATH = "/v1/auth";

const json = <T>(schema: T, description: string) => ({
  description,
  content: { "application/json": { schema } },
});
const problem = (description: string) => ({
  description,
  content: { "application/problem+json": { schema: ProblemSchema } },
});
const tooManyRequests = { $ref: "#/components/responses/TooManyRequests" };
const unauthorizedRef = { $ref: "#/components/responses/Unauthorized" };
const bearer = [{ bearerAuth: [] }];

// ---------------------------------------------------------------------------- serialización

function meBody(account: AccountView) {
  const { user, termsAcceptance } = account;
  return {
    id: user.id,
    email: user.email,
    status: userStatus(user),
    emailVerified: user.emailVerifiedAt !== null,
    birthDate: user.birthDate,
    createdAt: user.createdAt.toISOString(),
    termsAcceptance:
      termsAcceptance === null
        ? null
        : {
            version: termsAcceptance.version,
            acceptedAt: termsAcceptance.acceptedAt.toISOString(),
          },
  };
}

type Delivery = "body" | "cookie";

/** Respuesta de sesión. Con `cookie`, el refresh token va solo en la cookie HttpOnly. */
function sessionBody(c: Context<AppEnv>, issued: IssuedSession, delivery: Delivery) {
  if (delivery === "cookie") {
    setCookie(c, REFRESH_COOKIE, issued.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: REFRESH_COOKIE_PATH,
      expires: issued.refreshTokenExpiresAt,
    });
  }
  return {
    tokenType: "Bearer" as const,
    accessToken: issued.accessToken,
    expiresIn: ACCESS_TOKEN_TTL_MS / 1000,
    accessTokenExpiresAt: issued.accessTokenExpiresAt.toISOString(),
    refreshToken: delivery === "cookie" ? null : issued.refreshToken,
    refreshTokenExpiresAt: issued.refreshTokenExpiresAt.toISOString(),
    user: meBody(issued.account),
  };
}

function clearRefreshCookie(c: Context<AppEnv>) {
  deleteCookie(c, REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH, secure: true });
}

/** Refresh token del cuerpo (móvil) o de la cookie (web), y por dónde llegó. */
function presentedRefreshToken(
  c: Context<AppEnv>,
  fromBody: string | undefined,
): { token: string; delivery: Delivery } | null {
  if (fromBody !== undefined) return { token: fromBody, delivery: "body" };
  const fromCookie = getCookie(c, REFRESH_COOKIE);
  return fromCookie === undefined ? null : { token: fromCookie, delivery: "cookie" };
}

// ---------------------------------------------------------------------- errores de negocio

function registrationError(error: RegistrationDataError, minAge: number): AppError {
  const field = (path: string, message: string): FieldError[] => [{ path, message }];
  switch (error) {
    case "terms-outdated":
      return new AppError("validation-failed", {
        detail: "Los términos han cambiado. Revísalos y acéptalos de nuevo.",
        errors: field("termsVersion", "No es la versión vigente de los términos"),
      });
    case "invalid-birth-date":
      return new AppError("validation-failed", {
        errors: field("birthDate", "La fecha de nacimiento no es válida"),
      });
    case "underage":
      return new AppError("validation-failed", {
        detail: `Debes tener al menos ${minAge} años para registrarte.`,
        errors: field("birthDate", `Edad mínima: ${minAge} años`),
      });
  }
}

const breachedPassword = (path: string) =>
  new AppError("validation-failed", {
    errors: [
      { path, message: "Esta contraseña aparece en filtraciones conocidas. Elige otra distinta." },
    ],
  });

const invalidLink = () => new AppError("invalid-link");
const expiredLink = (detail: string) => new AppError("link-expired", { detail });

function googleError(error: GoogleSignInError, minAge: number): AppError {
  switch (error) {
    case "provider-disabled":
      return new AppError("auth-provider-disabled", {
        detail: "El inicio de sesión con Google no está configurado en este entorno.",
      });
    case "invalid-id-token":
      return new AppError("unauthorized", { detail: "El token de Google no es válido." });
    case "email-not-verified-by-provider":
      return new AppError("forbidden", {
        detail: "Google no ha verificado este correo. Verifícalo en tu cuenta de Google.",
      });
    case "registration-data-required":
      return new AppError("validation-failed", {
        detail:
          "Para crear la cuenta necesitamos tu fecha de nacimiento y que aceptes los términos.",
        errors: [
          { path: "birthDate", message: "Obligatoria para crear la cuenta" },
          { path: "termsVersion", message: "Obligatoria para crear la cuenta" },
        ],
      });
    case "concurrent-registration":
      return new AppError("conflict", {
        detail: "La cuenta se está creando. Vuelve a intentarlo.",
      });
    default:
      return registrationError(error, minAge);
  }
}

/** Ejecuta `work` y espera hasta que hayan pasado al menos `ms` desde el inicio. */
async function withMinimumDuration<T>(ms: number, work: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  const result = await work();
  const remaining = ms - (performance.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  return result;
}

// --------------------------------------------------------------------------------- rutas

const authTags = ["Autenticación"];
const accountTags = ["Cuenta"];

export function identityRoutes(options: IdentityRoutesOptions) {
  const deps = options.identity;
  const { minSignupAge } = deps.settings;
  const uniformMs = options.uniformResponseMs ?? DEFAULT_UNIFORM_RESPONSE_MS;
  const authLimit = rateLimit({ ...RATE_LIMITS.auth, store: options.rateLimitStore });
  // En el login, si Valkey cae, se prefiere un 503 a permitir fuerza bruta sin límite.
  const signInLimit = rateLimit({
    ...RATE_LIMITS.auth,
    store: options.rateLimitStore,
    failClosed: true,
  });

  const signUpRoute = createRoute({
    method: "post",
    path: "/auth/sign-up",
    tags: authTags,
    summary: "Registro con correo, contraseña y fecha de nacimiento",
    description:
      "FR-AUTH-001 y OR-LEG-001. La respuesta es la misma exista o no el correo; si existe, se envía un aviso al buzón. La cuenta queda `pending_verification` hasta abrir el enlace del correo (24 h).",
    middleware: [authLimit, idempotency({ store: options.idempotencyStore })],
    request: {
      headers: IdempotencyHeadersSchema,
      body: { content: { "application/json": { schema: SignUpRequestSchema } }, required: true },
    },
    responses: {
      202: json(SignUpResponseSchema, "Solicitud aceptada; revisa tu correo"),
      422: problem(
        "Datos no válidos, edad mínima no alcanzada, contraseña filtrada o términos desactualizados",
      ),
      429: tooManyRequests,
    },
  });

  const signInRoute = createRoute({
    method: "post",
    path: "/auth/sign-in",
    tags: authTags,
    summary: "Inicio de sesión con correo y contraseña",
    description:
      "Devuelve un access token de 15 min y un refresh token rotatorio de 30 días (FR-AUTH-004). Con `refreshTokenDelivery: cookie` el refresh va en una cookie HttpOnly (web).",
    middleware: [signInLimit],
    request: {
      body: { content: { "application/json": { schema: SignInRequestSchema } }, required: true },
    },
    responses: {
      200: json(AuthSessionSchema, "Sesión iniciada"),
      401: problem("Correo o contraseña incorrectos"),
      429: tooManyRequests,
      503: problem("El límite de intentos no está disponible; reintenta más tarde"),
    },
  });

  const googleRoute = createRoute({
    method: "post",
    path: "/auth/google",
    tags: authTags,
    summary: "Inicio de sesión o registro con Google (OIDC)",
    description:
      "FR-AUTH-003. Verifica el ID token de Google. Si el correo ya tiene cuenta, la vincula. Si la cuenta es nueva, exige `birthDate` y `termsVersion` (422 si faltan: el cliente los pide y reintenta con el mismo ID token).",
    middleware: [authLimit],
    request: {
      body: {
        content: { "application/json": { schema: GoogleSignInRequestSchema } },
        required: true,
      },
    },
    responses: {
      200: json(GoogleSignInResponseSchema, "Sesión iniciada"),
      401: problem("ID token no válido"),
      403: problem("Google no ha verificado el correo"),
      409: problem("Alta simultánea con el mismo correo"),
      422: problem("Faltan datos de registro o no son válidos"),
      429: tooManyRequests,
      503: problem("Google no está configurado en este entorno"),
    },
  });

  const refreshRoute = createRoute({
    method: "post",
    path: "/auth/refresh",
    tags: authTags,
    summary: "Renueva el access token rotando el refresh token",
    description:
      "FR-AUTH-004. El refresh token presentado (cuerpo o cookie) se consume y se emite otro. Reutilizar uno ya consumido revoca toda la sesión. La respuesta usa el mismo canal (cuerpo o cookie) por el que llegó el token.",
    request: {
      body: { content: { "application/json": { schema: RefreshRequestSchema } }, required: false },
    },
    responses: {
      200: json(AuthSessionSchema, "Tokens renovados"),
      401: problem("Refresh token ausente, desconocido, caducado, revocado o reutilizado"),
      429: tooManyRequests,
    },
  });

  const signOutRoute = createRoute({
    method: "post",
    path: "/auth/sign-out",
    tags: authTags,
    summary: "Cierra la sesión del refresh token",
    description: "Revoca la sesión y borra la cookie de refresh. Es idempotente.",
    request: {
      body: { content: { "application/json": { schema: SignOutRequestSchema } }, required: false },
    },
    responses: { 204: { description: "Sesión cerrada" }, 429: tooManyRequests },
  });

  const verifyEmailRoute = createRoute({
    method: "post",
    path: "/auth/verify-email",
    tags: authTags,
    summary: "Verifica el correo con el token del enlace",
    description: "FR-AUTH-002. El enlace vale 24 h. Caducado: 410 y se puede pedir otro.",
    middleware: [authLimit],
    request: {
      body: {
        content: { "application/json": { schema: VerifyEmailRequestSchema } },
        required: true,
      },
    },
    responses: {
      200: json(VerifyEmailResponseSchema, "Correo verificado"),
      400: problem("Enlace no válido o ya usado"),
      410: problem("Enlace caducado"),
      429: tooManyRequests,
    },
  });

  const resendVerificationRoute = createRoute({
    method: "post",
    path: "/auth/verify-email/resend",
    tags: authTags,
    summary: "Reenvía el enlace de verificación al usuario autenticado",
    middleware: [requireAuth, authLimit],
    security: bearer,
    responses: {
      202: { description: "Enlace reenviado" },
      401: unauthorizedRef,
      409: problem("El correo ya está verificado"),
      429: tooManyRequests,
    },
  });

  const forgotRoute = createRoute({
    method: "post",
    path: "/auth/password/forgot",
    tags: authTags,
    summary: "Solicita un enlace para restablecer la contraseña",
    description:
      "FR-AUTH-005. Responde siempre 202 con el mismo cuerpo, exista o no el correo. El enlace es de un solo uso y vale 1 h.",
    middleware: [authLimit],
    request: {
      body: {
        content: { "application/json": { schema: ForgotPasswordRequestSchema } },
        required: true,
      },
    },
    responses: {
      202: json(ForgotPasswordResponseSchema, "Solicitud aceptada"),
      429: tooManyRequests,
    },
  });

  const resetRoute = createRoute({
    method: "post",
    path: "/auth/password/reset",
    tags: authTags,
    summary: "Fija una contraseña nueva con el token del enlace",
    description: "Consume el enlace y cierra todas las sesiones abiertas de la cuenta.",
    middleware: [authLimit],
    request: {
      body: {
        content: { "application/json": { schema: ResetPasswordRequestSchema } },
        required: true,
      },
    },
    responses: {
      204: { description: "Contraseña cambiada" },
      400: problem("Enlace no válido o ya usado"),
      410: problem("Enlace caducado"),
      422: problem("La contraseña no cumple la política"),
      429: tooManyRequests,
    },
  });

  const meRoute = createRoute({
    method: "get",
    path: "/me",
    tags: accountTags,
    summary: "Cuenta del usuario autenticado",
    middleware: [requireAuth],
    security: bearer,
    responses: { 200: json(MeSchema, "Cuenta"), 401: unauthorizedRef, 429: tooManyRequests },
  });

  const sessionsRoute = createRoute({
    method: "get",
    path: "/me/sessions",
    tags: accountTags,
    summary: "Sesiones activas del usuario (FR-AUTH-007)",
    middleware: [requireAuth],
    security: bearer,
    request: { query: PaginationQuerySchema },
    responses: {
      200: json(SessionPageSchema, "Sesiones activas, de la más reciente a la más antigua"),
      401: unauthorizedRef,
      429: tooManyRequests,
    },
  });

  const revokeSessionRoute = createRoute({
    method: "delete",
    path: "/me/sessions/{id}",
    tags: accountTags,
    summary: "Cierra una sesión del usuario (FR-AUTH-007)",
    description:
      "Revoca su refresh token. El access token de esa sesión sigue siendo válido hasta caducar (≤ 15 min).",
    middleware: [requireAuth],
    security: bearer,
    request: { params: SessionIdParamSchema },
    responses: {
      204: { description: "Sesión cerrada" },
      401: unauthorizedRef,
      404: problem("La sesión no existe, ya está cerrada o no es tuya"),
      429: tooManyRequests,
    },
  });

  return new OpenAPIHono<AppEnv>()
    .openapi(signUpRoute, async (c) => {
      const body = c.req.valid("json");
      const result = await withMinimumDuration(uniformMs, () => signUp(deps, body));
      if (!result.ok) {
        if (result.error === "breached-password") throw breachedPassword("password");
        throw registrationError(result.error, minSignupAge);
      }
      return c.json(
        {
          status: "verification-pending" as const,
          message:
            "Si el correo es válido, recibirás un mensaje con los siguientes pasos. Revisa tu bandeja de entrada.",
        },
        202,
      );
    })
    .openapi(signInRoute, async (c) => {
      const { refreshTokenDelivery, ...credentials } = c.req.valid("json");
      const result = await signIn(deps, {
        ...credentials,
        userAgent: c.req.header("user-agent"),
      });
      if (!result.ok) {
        throw new AppError("unauthorized", { detail: "Correo o contraseña incorrectos." });
      }
      return c.json(sessionBody(c, result.value, refreshTokenDelivery), 200);
    })
    .openapi(googleRoute, async (c) => {
      const { refreshTokenDelivery, ...input } = c.req.valid("json");
      const result = await googleSignIn(deps, { ...input, userAgent: c.req.header("user-agent") });
      if (!result.ok) throw googleError(result.error, minSignupAge);
      return c.json(
        {
          ...sessionBody(c, result.value, refreshTokenDelivery),
          isNewUser: result.value.isNewUser,
        },
        200,
      );
    })
    .openapi(refreshRoute, async (c) => {
      // Sin cuerpo (web con cookie) no hay nada que validar: el validador lo deja pasar.
      const body: { refreshToken?: string | undefined } = c.req.valid("json") ?? {};
      const presented = presentedRefreshToken(c, body.refreshToken);
      if (presented === null) {
        throw new AppError("unauthorized", { detail: "Falta el refresh token." });
      }
      const result = await refreshSession(deps, presented.token);
      if (!result.ok) {
        if (presented.delivery === "cookie") clearRefreshCookie(c);
        throw new AppError("unauthorized", {
          detail: "La sesión ha caducado o se ha cerrado. Inicia sesión de nuevo.",
        });
      }
      return c.json(sessionBody(c, result.value, presented.delivery), 200);
    })
    .openapi(signOutRoute, async (c) => {
      const body: { refreshToken?: string | undefined } = c.req.valid("json") ?? {};
      const presented = presentedRefreshToken(c, body.refreshToken);
      if (presented !== null) await signOut(deps, presented.token);
      clearRefreshCookie(c);
      return c.body(null, 204);
    })
    .openapi(verifyEmailRoute, async (c) => {
      const result = await verifyEmail(deps, c.req.valid("json").token);
      if (!result.ok) {
        if (result.error === "expired-token") {
          throw expiredLink(
            "El enlace de verificación ha caducado. Inicia sesión y pide uno nuevo desde el aviso de tu cuenta.",
          );
        }
        throw invalidLink();
      }
      return c.json({ status: "verified" as const }, 200);
    })
    .openapi(resendVerificationRoute, async (c) => {
      const { userId } = authenticatedUser(c);
      const result = await resendVerification(deps, userId as Uuid);
      if (!result.ok) {
        if (result.error === "already-verified") {
          throw new AppError("conflict", { detail: "Tu correo ya está verificado." });
        }
        throw new AppError("unauthorized", { detail: "La cuenta ya no existe." });
      }
      return c.body(null, 202);
    })
    .openapi(forgotRoute, async (c) => {
      const { email } = c.req.valid("json");
      await withMinimumDuration(uniformMs, () => requestPasswordReset(deps, email));
      return c.json(
        {
          status: "accepted" as const,
          message:
            "Si hay una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.",
        },
        202,
      );
    })
    .openapi(resetRoute, async (c) => {
      const result = await resetPassword(deps, c.req.valid("json"));
      if (!result.ok) {
        if (result.error === "breached-password") throw breachedPassword("newPassword");
        if (result.error === "expired-token") {
          throw expiredLink(
            "El enlace ha caducado. Solicita uno nuevo desde «Olvidé mi contraseña».",
          );
        }
        throw invalidLink();
      }
      return c.body(null, 204);
    })
    .openapi(meRoute, async (c) => {
      const { userId } = authenticatedUser(c);
      const account = await getAccount(deps, userId as Uuid);
      if (account === null)
        throw new AppError("unauthorized", { detail: "La cuenta ya no existe." });
      return c.json(meBody(account), 200);
    })
    .openapi(sessionsRoute, async (c) => {
      const { userId, sessionId } = authenticatedUser(c);
      const page = await listSessions(deps, userId as Uuid, c.req.valid("query"));
      return c.json(
        {
          items: page.items.map((session) => ({
            id: session.id,
            createdAt: session.createdAt.toISOString(),
            lastUsedAt: session.lastUsedAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
            userAgent: session.userAgent,
            current: session.id === sessionId,
          })),
          nextCursor: page.nextCursor,
        },
        200,
      );
    })
    .openapi(revokeSessionRoute, async (c) => {
      const { userId } = authenticatedUser(c);
      const result = await revokeSession(deps, userId as Uuid, c.req.valid("param").id as Uuid);
      if (!result.ok) throw new AppError("not-found", { detail: "No encontramos esa sesión." });
      return c.body(null, 204);
    });
}
