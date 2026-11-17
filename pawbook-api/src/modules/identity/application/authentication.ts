import { uuidv7 } from "../../../shared/ids";
import { err, ok, type Result } from "../../../shared/result";
import { emailVerified, userRegistered } from "../domain/events";
import { normalizeEmail, type User } from "../domain/user";
import { loadAccount } from "./account";
import type { IdentityDeps, PasswordHasher } from "./ports";
import {
  checkRegistrationData,
  type RegistrationDataError,
  recordTermsAcceptance,
} from "./registration";
import { completeSession, type IssuedSession, openSession, startSession } from "./sessions";

/*
 * Inicio de sesión con correo y contraseña y con Google (FR-AUTH-003). Una cuenta sin
 * verificar puede iniciar sesión: lo que no puede es publicar, comentar ni chatear
 * (FR-AUTH-006, guard `requireVerifiedEmail`).
 */

/*
 * Hash de referencia para comparar cuando el correo no existe o la cuenta no tiene contraseña.
 * Así el login tarda lo mismo en todos los casos y el tiempo no revela qué correos existen.
 */
const dummyHashes = new WeakMap<PasswordHasher, Promise<string>>();

function dummyHash(hasher: PasswordHasher): Promise<string> {
  let hash = dummyHashes.get(hasher);
  if (hash === undefined) {
    hash = hasher.hash(crypto.randomUUID());
    dummyHashes.set(hasher, hash);
  }
  return hash;
}

export type SignInInput = {
  readonly email: string;
  readonly password: string;
  readonly userAgent?: string | undefined;
};

export async function signIn(
  deps: IdentityDeps,
  input: SignInInput,
): Promise<Result<IssuedSession, "invalid-credentials">> {
  const email = normalizeEmail(input.email);
  const user = await deps.unitOfWork.run((tx) => deps.users.findByEmail(tx, email));
  const storedHash = user?.passwordHash ?? (await dummyHash(deps.passwordHasher));
  const matches = await deps.passwordHasher.verify(storedHash, input.password);
  if (user === null || user.passwordHash === null || !matches) {
    return err("invalid-credentials");
  }
  return ok(await startSession(deps, user, input.userAgent));
}

export type GoogleSignInInput = {
  readonly idToken: string;
  readonly birthDate?: string | undefined;
  readonly termsVersion?: string | undefined;
  readonly userAgent?: string | undefined;
};

export type GoogleSignInError =
  | "provider-disabled"
  | "invalid-id-token"
  | "email-not-verified-by-provider"
  | "registration-data-required"
  | "concurrent-registration"
  | RegistrationDataError;

type GoogleOutcome =
  | { kind: "error"; error: GoogleSignInError }
  | { kind: "ok"; user: User; isNewUser: boolean };

/**
 * Login con un ID token de Google. Tres casos:
 * - La cuenta de Google ya está vinculada: se inicia sesión.
 * - Existe una cuenta con ese correo: se vincula, porque Google ha verificado que el correo es
 *   suyo (`email_verified`). Si esa cuenta aún no estaba verificada, su contraseña nunca se
 *   probó como del dueño del buzón (alguien pudo registrarla antes con un correo ajeno): se
 *   descarta junto con sus sesiones, y el dueño puede fijar otra con "olvidé mi contraseña".
 * - No existe: se crea, y entonces hacen falta fecha de nacimiento y términos como en el
 *   registro con correo. Si faltan, el cliente los pide y reintenta con el mismo ID token.
 */
export async function googleSignIn(
  deps: IdentityDeps,
  input: GoogleSignInInput,
): Promise<Result<IssuedSession & { isNewUser: boolean }, GoogleSignInError>> {
  if (deps.google === null) return err("provider-disabled");
  const identity = await deps.google.verify(input.idToken);
  if (identity === null) return err("invalid-id-token");
  if (!identity.emailVerified) return err("email-not-verified-by-provider");
  const email = normalizeEmail(identity.email);

  const result = await deps.unitOfWork.run(async (tx) => {
    const outcome = await (async (): Promise<GoogleOutcome> => {
      const now = deps.clock.now();
      const linkedUserId = await deps.externalAccounts.findUserId(tx, "google", identity.subject);
      if (linkedUserId !== null) {
        const linked = await deps.users.findById(tx, linkedUserId);
        if (linked === null) return { kind: "error", error: "invalid-id-token" };
        return { kind: "ok", user: linked, isNewUser: false };
      }

      const link = (userId: User["id"]) =>
        deps.externalAccounts.link(tx, {
          id: uuidv7(deps.clock),
          userId,
          provider: "google",
          subject: identity.subject,
          createdAt: now,
        });

      const existing = await deps.users.findByEmail(tx, email);
      if (existing !== null) {
        await link(existing.id);
        if (existing.emailVerifiedAt !== null) {
          return { kind: "ok", user: existing, isNewUser: false };
        }
        await deps.users.markEmailVerified(tx, existing.id, now);
        if (existing.passwordHash !== null) {
          await deps.users.updatePasswordHash(tx, existing.id, null);
          await deps.sessions.revokeAllForUser(tx, existing.id, "password-reset", now);
        }
        await deps.outbox.enqueue(tx, [emailVerified(existing.id, deps.clock)]);
        return {
          kind: "ok",
          user: { ...existing, emailVerifiedAt: now, passwordHash: null },
          isNewUser: false,
        };
      }

      if (input.birthDate === undefined || input.termsVersion === undefined) {
        return { kind: "error", error: "registration-data-required" };
      }
      const invalid = checkRegistrationData(deps, {
        birthDate: input.birthDate,
        termsVersion: input.termsVersion,
      });
      if (invalid !== null) return { kind: "error", error: invalid };

      const user: User = {
        id: uuidv7(deps.clock),
        email,
        passwordHash: null,
        birthDate: input.birthDate,
        emailVerifiedAt: now,
        createdAt: now,
      };
      if ((await deps.users.insert(tx, user)) === "email-taken") {
        // Otro alta con el mismo correo ganó la carrera: el cliente puede reintentar.
        return { kind: "error", error: "concurrent-registration" };
      }
      await link(user.id);
      await recordTermsAcceptance(deps, tx, user.id, input.termsVersion);
      await deps.outbox.enqueue(tx, [userRegistered(user.id, "google", deps.clock)]);
      return { kind: "ok", user, isNewUser: true };
    })();

    if (outcome.kind === "error") return outcome;
    return {
      kind: "ok" as const,
      isNewUser: outcome.isNewUser,
      opened: await openSession(deps, tx, outcome.user.id, input.userAgent),
      account: await loadAccount(deps, tx, outcome.user),
    };
  });

  if (result.kind === "error") return err(result.error);
  const issued = await completeSession(deps, result.account, result.opened);
  return ok({ ...issued, isNewUser: result.isNewUser });
}
