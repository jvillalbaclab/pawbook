import type { EmailMessage } from "../../../shared/email";
import type { Uuid } from "../../../shared/ids";
import type { Transaction } from "../../../shared/unit-of-work";
import type { User } from "../domain/user";
import type { IdentityDeps, TermsAcceptance } from "./ports";

/** Lo que el cliente ve de su cuenta (`GET /v1/me` y respuestas de login). */
export type AccountView = {
  readonly user: User;
  readonly termsAcceptance: TermsAcceptance | null;
};

export async function loadAccount(
  deps: IdentityDeps,
  tx: Transaction,
  user: User,
): Promise<AccountView> {
  return { user, termsAcceptance: await deps.terms.latest(tx, user.id) };
}

/** `null` si la cuenta ya no existe (p. ej. borrada con un access token aún vigente). */
export async function getAccount(deps: IdentityDeps, userId: Uuid): Promise<AccountView | null> {
  return deps.unitOfWork.run(async (tx) => {
    const user = await deps.users.findById(tx, userId);
    return user === null ? null : loadAccount(deps, tx, user);
  });
}

/**
 * Envía un correo sin hacer fallar la operación que ya se confirmó: si el proveedor cae,
 * el usuario puede pedir el reenvío. El fallo se informa sin datos personales.
 */
export async function sendEmailSafely(deps: IdentityDeps, message: EmailMessage): Promise<void> {
  try {
    await deps.email.send(message);
  } catch (error) {
    deps.reportError(error, { operation: "send-email", template: message.template });
  }
}
