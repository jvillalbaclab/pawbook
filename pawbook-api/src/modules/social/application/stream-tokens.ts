import { err, ok, type Result } from "../../../shared/result";
import { chatUserId, feedsUserId, STREAM_TOKEN_TTL_MS } from "../domain/stream-identity";
import type { SocialDeps } from "./ports";

/*
 * Tokens de Stream para el cliente (FR-AUTH-010, T-M0.36, arquitectura §5.3). La propiedad de la
 * mascota ya la verificó el middleware `activePet` antes de llegar aquí.
 */

export type StreamTokens = {
  readonly apiKey: string;
  readonly feedsUserId: string;
  readonly feedsToken: string;
  readonly chatUserId: string;
  /** `null` si el correo no está verificado: sin token no puede chatear (FR-AUTH-006). */
  readonly chatToken: string | null;
  readonly expiresAt: Date;
};

export type StreamTokensInput = {
  readonly userId: string;
  /** Mascota activa ya verificada. */
  readonly petId: string;
  readonly emailVerified: boolean;
};

export function issueStreamTokens(
  deps: SocialDeps,
  input: StreamTokensInput,
): Result<StreamTokens, "realtime-disabled"> {
  if (deps.tokens === null) return err("realtime-disabled");
  const issuedAt = deps.clock.now();
  const expiresAt = new Date(issuedAt.getTime() + STREAM_TOKEN_TTL_MS);
  const feedsUser = feedsUserId(input.petId);
  const chatUser = chatUserId(input.userId);
  return ok({
    apiKey: deps.tokens.apiKey,
    feedsUserId: feedsUser,
    feedsToken: deps.tokens.userToken(feedsUser, issuedAt, expiresAt),
    chatUserId: chatUser,
    chatToken: input.emailVerified ? deps.tokens.userToken(chatUser, issuedAt, expiresAt) : null,
    expiresAt,
  });
}
