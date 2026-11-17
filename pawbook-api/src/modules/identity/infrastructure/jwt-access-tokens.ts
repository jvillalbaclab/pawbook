import { errors, jwtVerify, SignJWT } from "jose";
import { type Clock, systemClock } from "../../../shared/clock";
import { isUuidV7, type Uuid } from "../../../shared/ids";
import type { AccessTokenClaims, AccessTokenIssuer } from "../application/ports";
import { ACCESS_TOKEN_TTL_MS } from "../domain/session";

/*
 * Access tokens JWT (FR-AUTH-004) firmados con HS256: solo esta API los emite y los verifica,
 * así que basta una clave simétrica (`AUTH_ACCESS_TOKEN_SECRET`). Son autocontenidos: la API
 * no consulta la base de datos en cada solicitud, a cambio de que un token revocado siga
 * valiendo hasta su caducidad (≤ 15 min).
 *
 * Claims: `sub` (usuario), `sid` (sesión, para marcar la actual en `GET /me/sessions`) y
 * `ev` (correo verificado, para el guard de FR-AUTH-006 sin ir a la base de datos).
 */
const ISSUER = "pawbook-api";
const AUDIENCE = "pawbook";
const ALGORITHM = "HS256";
/** HS256 necesita al menos 256 bits de clave para no ser el eslabón débil. */
export const MIN_SECRET_LENGTH = 32;

export class JwtAccessTokens implements AccessTokenIssuer {
  readonly #key: Uint8Array;
  readonly #clock: Clock;

  constructor(secret: string, clock: Clock = systemClock) {
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `El secreto de los access tokens debe tener al menos ${MIN_SECRET_LENGTH} caracteres`,
      );
    }
    this.#key = new TextEncoder().encode(secret);
    this.#clock = clock;
  }

  async issue(claims: AccessTokenClaims, now: Date): Promise<{ token: string; expiresAt: Date }> {
    const issuedAt = Math.floor(now.getTime() / 1000);
    const expiresAt = new Date(issuedAt * 1000 + ACCESS_TOKEN_TTL_MS);
    const token = await new SignJWT({ sid: claims.sessionId, ev: claims.emailVerified })
      .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
      .setSubject(claims.userId)
      // `jti` único: dos tokens emitidos en el mismo segundo nunca son idénticos.
      .setJti(crypto.randomUUID())
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(issuedAt)
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.#key);
    return { token, expiresAt };
  }

  /** Devuelve los claims si el token es válido y vigente; `null` en cualquier otro caso. */
  async verify(token: string): Promise<AccessTokenClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.#key, {
        algorithms: [ALGORITHM],
        issuer: ISSUER,
        audience: AUDIENCE,
        currentDate: this.#clock.now(),
        requiredClaims: ["sub", "exp", "iat"],
      });
      const { sub, sid, ev } = payload;
      if (typeof sub !== "string" || !isUuidV7(sub)) return null;
      if (typeof sid !== "string" || !isUuidV7(sid)) return null;
      if (typeof ev !== "boolean") return null;
      return { userId: sub as Uuid, sessionId: sid as Uuid, emailVerified: ev };
    } catch (error) {
      if (error instanceof errors.JOSEError) return null;
      throw error;
    }
  }
}
