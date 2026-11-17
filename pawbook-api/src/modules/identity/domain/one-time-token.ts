import type { Uuid } from "../../../shared/ids";

/*
 * Enlaces de un solo uso enviados por correo: verificación (FR-AUTH-002, 24 h) y recuperación
 * de contraseña (FR-AUTH-005, 1 h).
 */

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export type OneTimeTokenPurpose = "email-verification" | "password-reset";

export type OneTimeToken = {
  readonly id: Uuid;
  readonly userId: Uuid;
  readonly purpose: OneTimeTokenPurpose;
  readonly tokenHash: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
};

export type OneTimeTokenCheck = "valid" | "consumed" | "expired";

export function checkOneTimeToken(token: OneTimeToken, now: Date): OneTimeTokenCheck {
  if (token.consumedAt !== null) return "consumed";
  if (token.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}
