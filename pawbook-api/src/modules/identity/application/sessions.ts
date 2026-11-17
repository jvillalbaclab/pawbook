import type { Uuid } from "../../../shared/ids";
import { uuidv7 } from "../../../shared/ids";
import { decodeCursor, fetchSize, toPage } from "../../../shared/pagination";
import { err, ok, type Result } from "../../../shared/result";
import type { Transaction } from "../../../shared/unit-of-work";
import { generateOpaqueToken, hashOpaqueToken } from "../domain/opaque-token";
import {
  decideRefresh,
  REFRESH_TOKEN_TTL_MS,
  type Session,
  truncateUserAgent,
} from "../domain/session";
import type { User } from "../domain/user";
import { type AccountView, loadAccount } from "./account";
import type { IdentityDeps } from "./ports";

/*
 * Ciclo de vida de las sesiones (FR-AUTH-004 y FR-AUTH-007): abrir en el login, rotar el
 * refresh token, cerrar y listar.
 */

export type IssuedSession = {
  readonly account: AccountView;
  readonly sessionId: Uuid;
  readonly accessToken: string;
  readonly accessTokenExpiresAt: Date;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
};

type OpenedSession = {
  readonly sessionId: Uuid;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
};

/** Crea una familia nueva con su primer refresh token, dentro de la transacción del login. */
export async function openSession(
  deps: IdentityDeps,
  tx: Transaction,
  userId: Uuid,
  userAgent: string | undefined,
): Promise<OpenedSession> {
  const now = deps.clock.now();
  const sessionId = uuidv7(deps.clock);
  const refreshToken = generateOpaqueToken();
  const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);
  await deps.sessions.insertSession(tx, {
    id: sessionId,
    userId,
    userAgent: truncateUserAgent(userAgent),
    createdAt: now,
    lastUsedAt: now,
    expiresAt: refreshTokenExpiresAt,
    revokedAt: null,
    revokedReason: null,
  });
  await deps.sessions.insertRefreshToken(tx, {
    id: uuidv7(deps.clock),
    sessionId,
    tokenHash: await hashOpaqueToken(refreshToken),
    createdAt: now,
    expiresAt: refreshTokenExpiresAt,
    usedAt: null,
  });
  return { sessionId, refreshToken, refreshTokenExpiresAt };
}

/** Firma el access token una vez confirmada la transacción que creó o rotó la sesión. */
export async function completeSession(
  deps: IdentityDeps,
  account: AccountView,
  opened: OpenedSession,
): Promise<IssuedSession> {
  const access = await deps.accessTokens.issue(
    {
      userId: account.user.id,
      sessionId: opened.sessionId,
      emailVerified: account.user.emailVerifiedAt !== null,
    },
    deps.clock.now(),
  );
  return {
    account,
    sessionId: opened.sessionId,
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt,
    refreshToken: opened.refreshToken,
    refreshTokenExpiresAt: opened.refreshTokenExpiresAt,
  };
}

/** Abre una sesión para un usuario ya autenticado y emite sus tokens. */
export async function startSession(
  deps: IdentityDeps,
  user: User,
  userAgent: string | undefined,
): Promise<IssuedSession> {
  const { account, opened } = await deps.unitOfWork.run(async (tx) => ({
    opened: await openSession(deps, tx, user.id, userAgent),
    account: await loadAccount(deps, tx, user),
  }));
  return completeSession(deps, account, opened);
}

/**
 * Cualquier fallo de refresh es el mismo error para el cliente: no se distingue un token
 * desconocido de uno caducado o reutilizado, así no se filtra nada a quien lo robó.
 */
export type RefreshError = "invalid-refresh-token";

type RefreshOutcome =
  | { kind: "rotated"; account: AccountView; opened: OpenedSession }
  | { kind: "rejected" };

/**
 * Rota el refresh token: consume el presentado y emite el siguiente de la misma familia.
 * Si el token ya se había consumido, revoca la familia entera (detección de reutilización).
 * La revocación se confirma aunque la respuesta sea un error: por eso el caso de uso
 * devuelve un resultado en vez de lanzar dentro de la transacción.
 */
export async function refreshSession(
  deps: IdentityDeps,
  refreshToken: string,
): Promise<Result<IssuedSession, RefreshError>> {
  const tokenHash = await hashOpaqueToken(refreshToken);
  const outcome = await deps.unitOfWork.run(async (tx): Promise<RefreshOutcome> => {
    const found = await deps.sessions.findRefreshTokenForUpdate(tx, tokenHash);
    if (found === null) return { kind: "rejected" };
    const { token, session } = found;
    const now = deps.clock.now();

    const decision = decideRefresh(token, session, now);
    if (decision === "reuse-detected") {
      await deps.sessions.revoke(tx, session.id, "reuse-detected", now);
      return { kind: "rejected" };
    }
    if (decision !== "rotate") return { kind: "rejected" };

    const user = await deps.users.findById(tx, session.userId);
    if (user === null) return { kind: "rejected" };

    const next = generateOpaqueToken();
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);
    await deps.sessions.markRefreshTokenUsed(tx, token.id, now);
    await deps.sessions.insertRefreshToken(tx, {
      id: uuidv7(deps.clock),
      sessionId: session.id,
      tokenHash: await hashOpaqueToken(next),
      createdAt: now,
      expiresAt,
      usedAt: null,
    });
    await deps.sessions.touchSession(tx, session.id, now, expiresAt);
    return {
      kind: "rotated",
      account: await loadAccount(deps, tx, user),
      opened: { sessionId: session.id, refreshToken: next, refreshTokenExpiresAt: expiresAt },
    };
  });

  if (outcome.kind === "rejected") return err("invalid-refresh-token");
  return ok(await completeSession(deps, outcome.account, outcome.opened));
}

/** Cierra la sesión del refresh token presentado. Es idempotente: un token desconocido no falla. */
export async function signOut(deps: IdentityDeps, refreshToken: string): Promise<void> {
  const tokenHash = await hashOpaqueToken(refreshToken);
  await deps.unitOfWork.run(async (tx) => {
    const found = await deps.sessions.findRefreshTokenForUpdate(tx, tokenHash);
    if (found === null || found.session.revokedAt !== null) return;
    await deps.sessions.revoke(tx, found.session.id, "sign-out", deps.clock.now());
  });
}

export type SessionPage = { items: Session[]; nextCursor: string | null };

/** Sesiones activas del usuario, de la más reciente a la más antigua (FR-AUTH-007). */
export async function listSessions(
  deps: IdentityDeps,
  userId: Uuid,
  query: { cursor?: string | undefined; limit: number },
): Promise<SessionPage> {
  const after = query.cursor === undefined ? undefined : decodeCursor(query.cursor);
  const rows = await deps.unitOfWork.run((tx) =>
    deps.sessions.listActive(tx, userId, deps.clock.now(), after, fetchSize(query.limit)),
  );
  return toPage(rows, query.limit, (session) => ({ id: session.id }));
}

/** Cierra una sesión del propio usuario. Una sesión ajena responde igual que una inexistente. */
export async function revokeSession(
  deps: IdentityDeps,
  userId: Uuid,
  sessionId: Uuid,
): Promise<Result<void, "not-found">> {
  return deps.unitOfWork.run(async (tx) => {
    const session = await deps.sessions.findById(tx, sessionId);
    if (session === null || session.userId !== userId || session.revokedAt !== null) {
      return err("not-found");
    }
    await deps.sessions.revoke(tx, sessionId, "user-revoked", deps.clock.now());
    return ok(undefined);
  });
}
