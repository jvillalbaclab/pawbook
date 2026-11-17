import { createRemoteJWKSet, errors, type JWTVerifyGetKey, jwtVerify } from "jose";
import { type Clock, systemClock } from "../../../shared/clock";
import type { GoogleIdentity, GoogleIdTokenVerifier } from "../application/ports";

/*
 * Verificación local de ID tokens de Google (OIDC, FR-AUTH-003), como recomienda Google:
 * firma RS256 con sus claves públicas (JWKS, cacheadas por jose), emisor, audiencia (nuestros
 * client IDs) y caducidad. No hace falta llamar al endpoint `tokeninfo` en cada login.
 */
export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
/** Tolerancia de reloj entre Google y nuestros servidores. */
const CLOCK_TOLERANCE_SECONDS = 30;

export type GoogleVerifierOptions = {
  /** Client IDs OAuth aceptados como audiencia (web, y en el futuro iOS y Android). */
  readonly clientIds: readonly string[];
  /** Origen de las claves. Por defecto, el JWKS público de Google; los tests pasan uno local. */
  readonly keys?: JWTVerifyGetKey;
  readonly clock?: Clock;
};

export class JoseGoogleIdTokenVerifier implements GoogleIdTokenVerifier {
  readonly #clientIds: string[];
  readonly #keys: JWTVerifyGetKey;
  readonly #clock: Clock;

  constructor(options: GoogleVerifierOptions) {
    if (options.clientIds.length === 0) throw new Error("Falta al menos un client ID de Google");
    this.#clientIds = [...options.clientIds];
    this.#keys = options.keys ?? createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
    this.#clock = options.clock ?? systemClock;
  }

  async verify(idToken: string): Promise<GoogleIdentity | null> {
    try {
      const { payload } = await jwtVerify(idToken, this.#keys, {
        algorithms: ["RS256"],
        issuer: GOOGLE_ISSUERS,
        audience: this.#clientIds,
        currentDate: this.#clock.now(),
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
        requiredClaims: ["sub", "exp", "iat"],
      });
      const { sub, email, email_verified: emailVerified } = payload;
      if (typeof sub !== "string" || sub === "" || typeof email !== "string" || email === "") {
        return null;
      }
      return { subject: sub, email, emailVerified: emailVerified === true };
    } catch (error) {
      // Sin red o con Google caído no es un token inválido: se propaga y acaba en 5xx.
      if (error instanceof errors.JWKSTimeout) throw error;
      if (error instanceof errors.JOSEError) return null;
      throw error;
    }
  }
}
