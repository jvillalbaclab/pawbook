import type { Uuid } from "../../../shared/ids";
import { uuidv7 } from "../../../shared/ids";
import { err, ok, type Result } from "../../../shared/result";
import type { Transaction } from "../../../shared/unit-of-work";
import { checkBirthDate } from "../domain/age";
import { emailVerified, userRegistered } from "../domain/events";
import { checkOneTimeToken, EMAIL_VERIFICATION_TTL_MS } from "../domain/one-time-token";
import { generateOpaqueToken, hashOpaqueToken } from "../domain/opaque-token";
import { normalizeEmail, type User } from "../domain/user";
import { sendEmailSafely } from "./account";
import { accountExistsEmail, verificationEmail } from "./emails";
import type { IdentityDeps } from "./ports";

/*
 * Registro con correo (FR-AUTH-001), verificación del correo (FR-AUTH-002) y aceptación de
 * términos (OR-LEG-001).
 */

export type RegistrationDataError = "terms-outdated" | "invalid-birth-date" | "underage";

/** Valida los datos que exige cualquier alta, con correo o con Google. */
export function checkRegistrationData(
  deps: IdentityDeps,
  data: { birthDate: string; termsVersion: string },
): RegistrationDataError | null {
  if (data.termsVersion !== deps.settings.termsVersion) return "terms-outdated";
  const birth = checkBirthDate(data.birthDate, deps.settings.minSignupAge, deps.clock.now());
  if (birth === "invalid") return "invalid-birth-date";
  if (birth === "underage") return "underage";
  return null;
}

/** Registra la aceptación de los términos vigentes con su versión y fecha (OR-LEG-001). */
export async function recordTermsAcceptance(
  deps: IdentityDeps,
  tx: Transaction,
  userId: Uuid,
  version: string,
): Promise<void> {
  await deps.terms.record(tx, {
    id: uuidv7(deps.clock),
    userId,
    version,
    acceptedAt: deps.clock.now(),
  });
}

/** Crea un enlace de verificación nuevo e invalida los anteriores. Devuelve el token en claro. */
async function issueVerificationToken(
  deps: IdentityDeps,
  tx: Transaction,
  userId: Uuid,
): Promise<string> {
  const now = deps.clock.now();
  await deps.oneTimeTokens.consumeAllForUser(tx, userId, "email-verification", now);
  const token = generateOpaqueToken();
  await deps.oneTimeTokens.insert(tx, {
    id: uuidv7(deps.clock),
    userId,
    purpose: "email-verification",
    tokenHash: await hashOpaqueToken(token),
    createdAt: now,
    expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS),
    consumedAt: null,
  });
  return token;
}

export type SignUpInput = {
  readonly email: string;
  readonly password: string;
  readonly birthDate: string;
  readonly termsVersion: string;
};

export type SignUpError = RegistrationDataError | "breached-password";

/**
 * Alta con correo y contraseña. Exista o no el correo, el resultado es el mismo y se envía un
 * correo al buzón (verificación o aviso de cuenta existente): así la respuesta no permite
 * enumerar cuentas (arquitectura §9). El hash de la contraseña se calcula en ambos casos para
 * que el tiempo de respuesta no delate cuál fue.
 */
export async function signUp(
  deps: IdentityDeps,
  input: SignUpInput,
): Promise<Result<void, SignUpError>> {
  const invalid = checkRegistrationData(deps, input);
  if (invalid !== null) return err(invalid);
  if (await deps.breachedPasswords.isBreached(input.password)) return err("breached-password");

  const email = normalizeEmail(input.email);
  const passwordHash = await deps.passwordHasher.hash(input.password);

  const outcome = await deps.unitOfWork.run(
    async (tx): Promise<{ kind: "created"; token: string } | { kind: "exists" }> => {
      if ((await deps.users.findByEmail(tx, email)) !== null) return { kind: "exists" };
      const now = deps.clock.now();
      const user: User = {
        id: uuidv7(deps.clock),
        email,
        passwordHash,
        birthDate: input.birthDate,
        emailVerifiedAt: null,
        createdAt: now,
      };
      if ((await deps.users.insert(tx, user)) === "email-taken") return { kind: "exists" };
      await recordTermsAcceptance(deps, tx, user.id, input.termsVersion);
      const token = await issueVerificationToken(deps, tx, user.id);
      await deps.outbox.enqueue(tx, [userRegistered(user.id, "password", deps.clock)]);
      return { kind: "created", token };
    },
  );

  const { webAppUrl } = deps.settings;
  await sendEmailSafely(
    deps,
    outcome.kind === "created"
      ? verificationEmail(email, outcome.token, webAppUrl)
      : accountExistsEmail(email, webAppUrl),
  );
  return ok(undefined);
}

export type VerifyEmailError = "invalid-token" | "expired-token";

/**
 * Verifica el correo con el enlace recibido (FR-AUTH-002). Abrir dos veces el mismo enlace
 * no es un error si la cuenta ya quedó verificada: pasa al pulsar el enlace en dos pestañas.
 */
export async function verifyEmail(
  deps: IdentityDeps,
  token: string,
): Promise<Result<void, VerifyEmailError>> {
  const tokenHash = await hashOpaqueToken(token);
  return deps.unitOfWork.run(async (tx) => {
    const stored = await deps.oneTimeTokens.findByHashForUpdate(
      tx,
      tokenHash,
      "email-verification",
    );
    if (stored === null) return err("invalid-token");
    const user = await deps.users.findById(tx, stored.userId);
    if (user === null) return err("invalid-token");

    const now = deps.clock.now();
    const check = checkOneTimeToken(stored, now);
    if (check === "consumed") {
      return user.emailVerifiedAt !== null ? ok(undefined) : err("invalid-token");
    }
    if (check === "expired") return err("expired-token");

    await deps.oneTimeTokens.consume(tx, stored.id, now);
    if (user.emailVerifiedAt === null) {
      await deps.users.markEmailVerified(tx, user.id, now);
      await deps.outbox.enqueue(tx, [emailVerified(user.id, deps.clock)]);
    }
    return ok(undefined);
  });
}

/** Reenvía el enlace de verificación al usuario autenticado ("Reenviar" del aviso, US-01). */
export async function resendVerification(
  deps: IdentityDeps,
  userId: Uuid,
): Promise<Result<void, "already-verified" | "not-found">> {
  const outcome = await deps.unitOfWork.run(async (tx) => {
    const user = await deps.users.findById(tx, userId);
    if (user === null) return err("not-found" as const);
    if (user.emailVerifiedAt !== null) return err("already-verified" as const);
    return ok({ email: user.email, token: await issueVerificationToken(deps, tx, user.id) });
  });
  if (!outcome.ok) return outcome;
  await sendEmailSafely(
    deps,
    verificationEmail(outcome.value.email, outcome.value.token, deps.settings.webAppUrl),
  );
  return ok(undefined);
}
