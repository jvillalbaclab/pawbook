import { uuidv7 } from "../../../shared/ids";
import { err, ok, type Result } from "../../../shared/result";
import { emailVerified } from "../domain/events";
import { checkOneTimeToken, PASSWORD_RESET_TTL_MS } from "../domain/one-time-token";
import { generateOpaqueToken, hashOpaqueToken } from "../domain/opaque-token";
import { normalizeEmail } from "../domain/user";
import { sendEmailSafely } from "./account";
import { passwordResetEmail } from "./emails";
import type { IdentityDeps } from "./ports";

/*
 * Recuperación de contraseña (FR-AUTH-005): enlace de un solo uso válido 1 h. La solicitud
 * responde igual exista o no el correo; la ruta HTTP además iguala el tiempo de respuesta.
 */

export async function requestPasswordReset(deps: IdentityDeps, rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const issued = await deps.unitOfWork.run(async (tx) => {
    const user = await deps.users.findByEmail(tx, email);
    if (user === null) return null;
    const now = deps.clock.now();
    // Pedir un enlace nuevo invalida los anteriores: solo vale el último correo recibido.
    await deps.oneTimeTokens.consumeAllForUser(tx, user.id, "password-reset", now);
    const token = generateOpaqueToken();
    await deps.oneTimeTokens.insert(tx, {
      id: uuidv7(deps.clock),
      userId: user.id,
      purpose: "password-reset",
      tokenHash: await hashOpaqueToken(token),
      createdAt: now,
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
      consumedAt: null,
    });
    return { email: user.email, token };
  });
  if (issued === null) return;
  await sendEmailSafely(
    deps,
    passwordResetEmail(issued.email, issued.token, deps.settings.webAppUrl),
  );
}

export type ResetPasswordError = "invalid-token" | "expired-token" | "breached-password";

/**
 * Fija la contraseña nueva, consume el enlace y cierra todas las sesiones: si alguien entró
 * con la contraseña anterior, pierde el acceso. Usar el enlace también prueba la propiedad
 * del correo, así que una cuenta pendiente queda verificada.
 */
export async function resetPassword(
  deps: IdentityDeps,
  input: { token: string; newPassword: string },
): Promise<Result<void, ResetPasswordError>> {
  const tokenHash = await hashOpaqueToken(input.token);
  // Se comprueba el token antes de hacer el trabajo caro (HIBP y Argon2id).
  const precheck = await deps.unitOfWork.run(async (tx) => {
    const stored = await deps.oneTimeTokens.findByHashForUpdate(tx, tokenHash, "password-reset");
    return stored === null ? "consumed" : checkOneTimeToken(stored, deps.clock.now());
  });
  if (precheck === "consumed") return err("invalid-token");
  if (precheck === "expired") return err("expired-token");

  if (await deps.breachedPasswords.isBreached(input.newPassword)) return err("breached-password");
  const passwordHash = await deps.passwordHasher.hash(input.newPassword);

  return deps.unitOfWork.run(async (tx) => {
    // Se vuelve a leer con bloqueo: otra solicitud pudo consumir el enlace mientras tanto.
    const stored = await deps.oneTimeTokens.findByHashForUpdate(tx, tokenHash, "password-reset");
    const now = deps.clock.now();
    if (stored === null) return err("invalid-token");
    const check = checkOneTimeToken(stored, now);
    if (check === "consumed") return err("invalid-token");
    if (check === "expired") return err("expired-token");
    const user = await deps.users.findById(tx, stored.userId);
    if (user === null) return err("invalid-token");

    await deps.oneTimeTokens.consume(tx, stored.id, now);
    await deps.users.updatePasswordHash(tx, user.id, passwordHash);
    await deps.sessions.revokeAllForUser(tx, user.id, "password-reset", now);
    if (user.emailVerifiedAt === null) {
      await deps.users.markEmailVerified(tx, user.id, now);
      await deps.outbox.enqueue(tx, [emailVerified(user.id, deps.clock)]);
    }
    return ok(undefined);
  });
}
