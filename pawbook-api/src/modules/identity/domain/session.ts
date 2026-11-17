import type { Uuid } from "../../../shared/ids";

/*
 * Sesiones y refresh tokens rotatorios (FR-AUTH-004, arquitectura §9 "robo de token").
 *
 * Una sesión es una familia de refresh tokens: nace en el login y cada `POST /auth/refresh`
 * consume el token presentado y emite el siguiente de la misma familia. Un token consumido
 * no vuelve a servir; si alguien lo presenta otra vez, uno de los dos (el usuario legítimo o
 * quien lo robó) tiene una copia, y no hay forma de saber cuál: se revoca la familia entera.
 */

/** Vida del access token (FR-AUTH-004: ≤ 15 min). */
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
/** Vida de cada refresh token desde que se emite (FR-AUTH-004: ≤ 30 días). */
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type RevocationReason = "sign-out" | "reuse-detected" | "password-reset" | "user-revoked";

export type Session = {
  readonly id: Uuid;
  readonly userId: Uuid;
  /** Agente de usuario recortado, solo para que el usuario reconozca la sesión (FR-AUTH-007). */
  readonly userAgent: string | null;
  readonly createdAt: Date;
  readonly lastUsedAt: Date;
  /** Caducidad del refresh token vigente: pasado este instante la sesión ya no se renueva. */
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly revokedReason: RevocationReason | null;
};

export type RefreshToken = {
  readonly id: Uuid;
  readonly sessionId: Uuid;
  readonly tokenHash: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  /** Momento en que se consumió al rotar. Un token con `usedAt` presentado de nuevo es un reuso. */
  readonly usedAt: Date | null;
};

export type RefreshDecision = "rotate" | "reuse-detected" | "expired" | "revoked";

/**
 * Qué hacer con un refresh token presentado. El orden importa: un reuso se detecta aunque el
 * token ya haya caducado, porque sigue indicando que la familia está comprometida.
 */
export function decideRefresh(token: RefreshToken, session: Session, now: Date): RefreshDecision {
  if (session.revokedAt !== null) return "revoked";
  if (token.usedAt !== null) return "reuse-detected";
  if (token.expiresAt.getTime() <= now.getTime()) return "expired";
  return "rotate";
}

export function isSessionActive(session: Session, now: Date): boolean {
  return session.revokedAt === null && session.expiresAt.getTime() > now.getTime();
}

const USER_AGENT_MAX_LENGTH = 200;

export function truncateUserAgent(userAgent: string | undefined): string | null {
  const trimmed = userAgent?.trim();
  if (trimmed === undefined || trimmed === "") return null;
  return trimmed.slice(0, USER_AGENT_MAX_LENGTH);
}
