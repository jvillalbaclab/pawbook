import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { dbTransaction } from "../../../infrastructure/db/database";
import type { Uuid } from "../../../shared/ids";
import type { CursorPosition } from "../../../shared/pagination";
import type { Transaction } from "../../../shared/unit-of-work";
import type {
  ExternalAccountRepository,
  ExternalProvider,
  OneTimeTokenRepository,
  SessionRepository,
  TermsAcceptance,
  TermsAcceptanceRepository,
  UserRepository,
} from "../application/ports";
import type { OneTimeToken, OneTimeTokenPurpose } from "../domain/one-time-token";
import type { RefreshToken, RevocationReason, Session } from "../domain/session";
import type { User } from "../domain/user";
import {
  externalAccounts,
  oneTimeTokens,
  refreshTokens,
  sessions,
  termsAcceptances,
  users,
} from "./schema";

/*
 * Repositorios Drizzle de identity. Todos trabajan sobre la transacción del caso de uso.
 * Las columnas `uuid` vuelven como `string`; se marcan como `Uuid` porque las escribe la app
 * con `uuidv7()` y la base de datos no genera otras.
 */

type UserRow = typeof users.$inferSelect;
type SessionRow = typeof sessions.$inferSelect;
type RefreshTokenRow = typeof refreshTokens.$inferSelect;
type OneTimeTokenRow = typeof oneTimeTokens.$inferSelect;

const toUser = (row: UserRow): User => ({
  id: row.id as Uuid,
  email: row.email,
  passwordHash: row.passwordHash,
  birthDate: row.birthDate,
  emailVerifiedAt: row.emailVerifiedAt,
  createdAt: row.createdAt,
});

const toSession = (row: SessionRow): Session => ({
  id: row.id as Uuid,
  userId: row.userId as Uuid,
  userAgent: row.userAgent,
  createdAt: row.createdAt,
  lastUsedAt: row.lastUsedAt,
  expiresAt: row.expiresAt,
  revokedAt: row.revokedAt,
  revokedReason: row.revokedReason,
});

const toRefreshToken = (row: RefreshTokenRow): RefreshToken => ({
  id: row.id as Uuid,
  sessionId: row.sessionId as Uuid,
  tokenHash: row.tokenHash,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
  usedAt: row.usedAt,
});

const toOneTimeToken = (row: OneTimeTokenRow): OneTimeToken => ({
  id: row.id as Uuid,
  userId: row.userId as Uuid,
  purpose: row.purpose,
  tokenHash: row.tokenHash,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
  consumedAt: row.consumedAt,
});

export class DrizzleUserRepository implements UserRepository {
  async findByEmail(tx: Transaction, email: string): Promise<User | null> {
    const [row] = await dbTransaction(tx).select().from(users).where(eq(users.email, email));
    return row === undefined ? null : toUser(row);
  }

  async findById(tx: Transaction, id: Uuid): Promise<User | null> {
    const [row] = await dbTransaction(tx).select().from(users).where(eq(users.id, id));
    return row === undefined ? null : toUser(row);
  }

  async insert(tx: Transaction, user: User): Promise<"inserted" | "email-taken"> {
    // ON CONFLICT DO NOTHING en vez de capturar el 23505: un error abortaría la transacción.
    const inserted = await dbTransaction(tx)
      .insert(users)
      .values({ ...user, updatedAt: user.createdAt })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });
    return inserted.length === 1 ? "inserted" : "email-taken";
  }

  async markEmailVerified(tx: Transaction, userId: Uuid, at: Date): Promise<void> {
    await dbTransaction(tx)
      .update(users)
      .set({ emailVerifiedAt: at, updatedAt: at })
      .where(eq(users.id, userId));
  }

  async updatePasswordHash(
    tx: Transaction,
    userId: Uuid,
    passwordHash: string | null,
  ): Promise<void> {
    await dbTransaction(tx)
      .update(users)
      .set({ passwordHash, updatedAt: sql`now()` })
      .where(eq(users.id, userId));
  }
}

export class DrizzleTermsAcceptanceRepository implements TermsAcceptanceRepository {
  async record(tx: Transaction, acceptance: TermsAcceptance): Promise<void> {
    await dbTransaction(tx).insert(termsAcceptances).values(acceptance);
  }

  async latest(tx: Transaction, userId: Uuid): Promise<TermsAcceptance | null> {
    const [row] = await dbTransaction(tx)
      .select()
      .from(termsAcceptances)
      .where(eq(termsAcceptances.userId, userId))
      .orderBy(desc(termsAcceptances.id))
      .limit(1);
    return row === undefined ? null : { ...row, id: row.id as Uuid, userId: row.userId as Uuid };
  }
}

export class DrizzleExternalAccountRepository implements ExternalAccountRepository {
  async findUserId(
    tx: Transaction,
    provider: ExternalProvider,
    subject: string,
  ): Promise<Uuid | null> {
    const [row] = await dbTransaction(tx)
      .select({ userId: externalAccounts.userId })
      .from(externalAccounts)
      .where(and(eq(externalAccounts.provider, provider), eq(externalAccounts.subject, subject)));
    return row === undefined ? null : (row.userId as Uuid);
  }

  async link(
    tx: Transaction,
    account: {
      id: Uuid;
      userId: Uuid;
      provider: ExternalProvider;
      subject: string;
      createdAt: Date;
    },
  ): Promise<void> {
    await dbTransaction(tx).insert(externalAccounts).values(account);
  }
}

export class DrizzleOneTimeTokenRepository implements OneTimeTokenRepository {
  async insert(tx: Transaction, token: OneTimeToken): Promise<void> {
    await dbTransaction(tx).insert(oneTimeTokens).values(token);
  }

  async findByHashForUpdate(
    tx: Transaction,
    tokenHash: string,
    purpose: OneTimeTokenPurpose,
  ): Promise<OneTimeToken | null> {
    const [row] = await dbTransaction(tx)
      .select()
      .from(oneTimeTokens)
      .where(and(eq(oneTimeTokens.tokenHash, tokenHash), eq(oneTimeTokens.purpose, purpose)))
      .for("update");
    return row === undefined ? null : toOneTimeToken(row);
  }

  async consume(tx: Transaction, id: Uuid, at: Date): Promise<void> {
    await dbTransaction(tx)
      .update(oneTimeTokens)
      .set({ consumedAt: at })
      .where(eq(oneTimeTokens.id, id));
  }

  async consumeAllForUser(
    tx: Transaction,
    userId: Uuid,
    purpose: OneTimeTokenPurpose,
    at: Date,
  ): Promise<void> {
    await dbTransaction(tx)
      .update(oneTimeTokens)
      .set({ consumedAt: at })
      .where(
        and(
          eq(oneTimeTokens.userId, userId),
          eq(oneTimeTokens.purpose, purpose),
          isNull(oneTimeTokens.consumedAt),
        ),
      );
  }
}

export class DrizzleSessionRepository implements SessionRepository {
  async insertSession(tx: Transaction, session: Session): Promise<void> {
    await dbTransaction(tx).insert(sessions).values(session);
  }

  async insertRefreshToken(tx: Transaction, token: RefreshToken): Promise<void> {
    await dbTransaction(tx).insert(refreshTokens).values(token);
  }

  async findRefreshTokenForUpdate(
    tx: Transaction,
    tokenHash: string,
  ): Promise<{ token: RefreshToken; session: Session } | null> {
    // FOR UPDATE bloquea el token y su sesión: dos refresh simultáneos con el mismo token se
    // serializan y el segundo ve `used_at` (reuso) en vez de rotar dos veces.
    const [row] = await dbTransaction(tx)
      .select({ token: refreshTokens, session: sessions })
      .from(refreshTokens)
      .innerJoin(sessions, eq(sessions.id, refreshTokens.sessionId))
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .for("update");
    return row === undefined
      ? null
      : { token: toRefreshToken(row.token), session: toSession(row.session) };
  }

  async markRefreshTokenUsed(tx: Transaction, tokenId: Uuid, at: Date): Promise<void> {
    await dbTransaction(tx)
      .update(refreshTokens)
      .set({ usedAt: at })
      .where(eq(refreshTokens.id, tokenId));
  }

  async touchSession(
    tx: Transaction,
    sessionId: Uuid,
    lastUsedAt: Date,
    expiresAt: Date,
  ): Promise<void> {
    await dbTransaction(tx)
      .update(sessions)
      .set({ lastUsedAt, expiresAt })
      .where(eq(sessions.id, sessionId));
  }

  async revoke(
    tx: Transaction,
    sessionId: Uuid,
    reason: RevocationReason,
    at: Date,
  ): Promise<void> {
    await dbTransaction(tx)
      .update(sessions)
      .set({ revokedAt: at, revokedReason: reason })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
  }

  async revokeAllForUser(
    tx: Transaction,
    userId: Uuid,
    reason: RevocationReason,
    at: Date,
  ): Promise<void> {
    await dbTransaction(tx)
      .update(sessions)
      .set({ revokedAt: at, revokedReason: reason })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  async findById(tx: Transaction, sessionId: Uuid): Promise<Session | null> {
    const [row] = await dbTransaction(tx).select().from(sessions).where(eq(sessions.id, sessionId));
    return row === undefined ? null : toSession(row);
  }

  async listActive(
    tx: Transaction,
    userId: Uuid,
    now: Date,
    after: CursorPosition | undefined,
    limit: number,
  ): Promise<Session[]> {
    const rows = await dbTransaction(tx)
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
          after === undefined ? undefined : lt(sessions.id, after.id),
        ),
      )
      .orderBy(desc(sessions.id))
      .limit(limit);
    return rows.map(toSession);
  }
}
