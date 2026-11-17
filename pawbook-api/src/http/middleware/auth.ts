import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { AppError } from "../../shared/errors";
import type { AppEnv } from "../types";

/*
 * Autenticación por `Authorization: Bearer <accessToken>` (COM-002), igual para web y móvil.
 * El middleware no conoce cómo se firman los tokens: recibe un verificador (el módulo identity
 * lo implementa y la composición lo conecta), así `src/http` no depende de ningún módulo.
 */

export type VerifiedAccessToken = {
  readonly userId: string;
  readonly sessionId: string;
  readonly emailVerified: boolean;
};

export interface AccessTokenVerifier {
  /** Claims del token si es válido y vigente; `null` si no. */
  verify(token: string): Promise<VerifiedAccessToken | null>;
}

const BEARER_PATTERN = /^Bearer[ ]+([A-Za-z0-9._~+/-]+=*)$/i;
const WWW_AUTHENTICATE = 'Bearer realm="pawbook"';

/**
 * Lee el Bearer y, si es válido, deja `userId`, `sessionId` y `emailVerified` en el contexto.
 * Va antes del rate limit global para que el límite cuente por usuario y no por IP.
 *
 * Un token presente pero inválido no se rechaza aquí sino en `rejectInvalidToken`, que va
 * después del rate limit: así quien envía tokens basura sigue contando contra el límite de
 * su IP en vez de saltárselo.
 */
export function authenticate(verifier: AccessTokenVerifier) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header("authorization");
    if (header !== undefined) {
      const match = BEARER_PATTERN.exec(header.trim());
      const claims = match?.[1] === undefined ? null : await verifier.verify(match[1]);
      if (claims === null) {
        c.set("authError", "invalid-token");
      } else {
        c.set("userId", claims.userId);
        c.set("sessionId", claims.sessionId);
        c.set("emailVerified", claims.emailVerified);
      }
    }
    await next();
  });
}

function unauthorized(c: Context<AppEnv>, detail: string): AppError {
  c.header("WWW-Authenticate", WWW_AUTHENTICATE);
  return new AppError("unauthorized", { detail });
}

/** 401 si la solicitud trae un Bearer inválido o caducado (el cliente debe renovarlo). */
export const rejectInvalidToken = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get("authError") !== undefined) {
    throw unauthorized(c, "El token de acceso no es válido o ha caducado.");
  }
  await next();
});

/** Usuario autenticado de la solicitud. Para rutas montadas detrás de `requireAuth`. */
export function authenticatedUser(c: Context<AppEnv>): {
  userId: string;
  sessionId: string;
  emailVerified: boolean;
} {
  const userId = c.get("userId");
  const sessionId = c.get("sessionId");
  if (userId === undefined || sessionId === undefined) {
    throw unauthorized(c, "Necesitas iniciar sesión.");
  }
  return { userId, sessionId, emailVerified: c.get("emailVerified") === true };
}

/** 401 si no hay usuario autenticado. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  authenticatedUser(c);
  await next();
});

/**
 * Guard de FR-AUTH-006: publicar, comentar o chatear exige el correo verificado. Responde
 * 403 `email-not-verified` para que el cliente muestre el aviso con "Reenviar". Incluye
 * `requireAuth`, así basta con montarlo en las rutas sociales:
 *
 *   app.openapi({ ...createPostRoute, middleware: [requireVerifiedEmail] }, handler)
 *
 * Lee el claim `ev` del access token: tras verificar el correo, el cliente renueva el token
 * (`POST /v1/auth/refresh`) y el nuevo ya lleva `ev = true`.
 */
export const requireVerifiedEmail = createMiddleware<AppEnv>(async (c, next) => {
  const { emailVerified } = authenticatedUser(c);
  if (!emailVerified) {
    throw new AppError("email-not-verified", {
      detail: "Confirma tu correo con el enlace que te enviamos para publicar, comentar o chatear.",
    });
  }
  await next();
});
