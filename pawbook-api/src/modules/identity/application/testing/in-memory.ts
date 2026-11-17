import { type Clock, fixedClock } from "../../../../shared/clock";
import type { EmailMessage, EmailSender } from "../../../../shared/email";
import type { DomainEvent, EventOutbox } from "../../../../shared/events";
import type { Uuid } from "../../../../shared/ids";
import { type CursorPosition, isAfterCursor } from "../../../../shared/pagination";
import type { Transaction, UnitOfWork } from "../../../../shared/unit-of-work";
import type { OneTimeToken, OneTimeTokenPurpose } from "../../domain/one-time-token";
import type { RefreshToken, RevocationReason, Session } from "../../domain/session";
import type { User } from "../../domain/user";
import type {
  AccessTokenClaims,
  AccessTokenIssuer,
  ExternalAccountRepository,
  ExternalProvider,
  GoogleIdentity,
  GoogleIdTokenVerifier,
  IdentityDeps,
  OneTimeTokenRepository,
  PasswordHasher,
  SessionRepository,
  TermsAcceptance,
  TermsAcceptanceRepository,
  UserRepository,
} from "../ports";

/*
 * Adaptadores en memoria para los tests unitarios de los casos de uso: herméticos, sin
 * Postgres ni red. `MemoryIdentityStore` implementa todos los repositorios sobre un estado
 * que `MemoryUnitOfWork` restaura si la transacción lanza (rollback simulado).
 */

type State = {
  users: Map<string, User>;
  terms: TermsAcceptance[];
  external: { userId: Uuid; provider: ExternalProvider; subject: string }[];
  oneTimeTokens: Map<string, OneTimeToken>;
  sessions: Map<string, Session>;
  refreshTokens: Map<string, RefreshToken>;
  events: DomainEvent[];
};

const emptyState = (): State => ({
  users: new Map(),
  terms: [],
  external: [],
  oneTimeTokens: new Map(),
  sessions: new Map(),
  refreshTokens: new Map(),
  events: [],
});

export class MemoryIdentityStore
  implements
    UserRepository,
    TermsAcceptanceRepository,
    ExternalAccountRepository,
    EventOutbox,
    UnitOfWork
{
  state: State = emptyState();

  async run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    const snapshot = structuredClone(this.state);
    try {
      return await work(Object.freeze({}) as Transaction);
    } catch (error) {
      this.state = snapshot;
      throw error;
    }
  }

  // EventOutbox
  async enqueue(_tx: Transaction, events: readonly DomainEvent[]): Promise<void> {
    this.state.events.push(...events);
  }

  // UserRepository
  async findByEmail(_tx: Transaction, email: string) {
    return [...this.state.users.values()].find((user) => user.email === email) ?? null;
  }
  async findById(_tx: Transaction, id: Uuid) {
    return this.state.users.get(id) ?? null;
  }
  async insert(tx: Transaction, user: User) {
    if ((await this.findByEmail(tx, user.email)) !== null) return "email-taken" as const;
    this.state.users.set(user.id, user);
    return "inserted" as const;
  }
  async markEmailVerified(_tx: Transaction, userId: Uuid, at: Date) {
    const user = this.state.users.get(userId);
    if (user !== undefined) this.state.users.set(userId, { ...user, emailVerifiedAt: at });
  }
  async updatePasswordHash(_tx: Transaction, userId: Uuid, passwordHash: string | null) {
    const user = this.state.users.get(userId);
    if (user !== undefined) this.state.users.set(userId, { ...user, passwordHash });
  }

  // TermsAcceptanceRepository
  async record(_tx: Transaction, acceptance: TermsAcceptance) {
    this.state.terms.push(acceptance);
  }
  async latest(_tx: Transaction, userId: Uuid) {
    return this.state.terms.findLast((acceptance) => acceptance.userId === userId) ?? null;
  }

  // ExternalAccountRepository
  async findUserId(_tx: Transaction, provider: ExternalProvider, subject: string) {
    const found = this.state.external.find(
      (account) => account.provider === provider && account.subject === subject,
    );
    return found?.userId ?? null;
  }
  async link(
    _tx: Transaction,
    account: { userId: Uuid; provider: ExternalProvider; subject: string },
  ) {
    this.state.external.push({
      userId: account.userId,
      provider: account.provider,
      subject: account.subject,
    });
  }

  // OneTimeTokenRepository y SessionRepository: expuestos abajo como objetos, porque sus
  // `insert` y `findById` chocarían con los de usuarios en esta misma clase.
  async findByHashForUpdate(_tx: Transaction, tokenHash: string, purpose: OneTimeTokenPurpose) {
    return (
      [...this.state.oneTimeTokens.values()].find(
        (token) => token.tokenHash === tokenHash && token.purpose === purpose,
      ) ?? null
    );
  }
  async consume(_tx: Transaction, id: Uuid, at: Date) {
    const token = this.state.oneTimeTokens.get(id);
    if (token !== undefined) this.state.oneTimeTokens.set(id, { ...token, consumedAt: at });
  }
  async consumeAllForUser(_tx: Transaction, userId: Uuid, purpose: OneTimeTokenPurpose, at: Date) {
    for (const token of this.state.oneTimeTokens.values()) {
      if (token.userId === userId && token.purpose === purpose && token.consumedAt === null) {
        this.state.oneTimeTokens.set(token.id, { ...token, consumedAt: at });
      }
    }
  }

  // SessionRepository
  async insertSession(_tx: Transaction, session: Session) {
    this.state.sessions.set(session.id, session);
  }
  async insertRefreshToken(_tx: Transaction, token: RefreshToken) {
    this.state.refreshTokens.set(token.id, token);
  }
  async findRefreshTokenForUpdate(_tx: Transaction, tokenHash: string) {
    const token = [...this.state.refreshTokens.values()].find((t) => t.tokenHash === tokenHash);
    const session = token === undefined ? undefined : this.state.sessions.get(token.sessionId);
    return token === undefined || session === undefined ? null : { token, session };
  }
  async markRefreshTokenUsed(_tx: Transaction, tokenId: Uuid, at: Date) {
    const token = this.state.refreshTokens.get(tokenId);
    if (token !== undefined) this.state.refreshTokens.set(tokenId, { ...token, usedAt: at });
  }
  async touchSession(_tx: Transaction, sessionId: Uuid, lastUsedAt: Date, expiresAt: Date) {
    const session = this.state.sessions.get(sessionId);
    if (session !== undefined) {
      this.state.sessions.set(sessionId, { ...session, lastUsedAt, expiresAt });
    }
  }
  async revoke(_tx: Transaction, sessionId: Uuid, reason: RevocationReason, at: Date) {
    const session = this.state.sessions.get(sessionId);
    if (session !== undefined && session.revokedAt === null) {
      this.state.sessions.set(sessionId, { ...session, revokedAt: at, revokedReason: reason });
    }
  }
  async revokeAllForUser(tx: Transaction, userId: Uuid, reason: RevocationReason, at: Date) {
    for (const session of this.state.sessions.values()) {
      if (session.userId === userId) await this.revoke(tx, session.id, reason, at);
    }
  }
  async listActive(
    _tx: Transaction,
    userId: Uuid,
    now: Date,
    after: CursorPosition | undefined,
    limit: number,
  ) {
    return [...this.state.sessions.values()]
      .filter((s) => s.userId === userId && s.revokedAt === null && s.expiresAt > now)
      .filter((s) => after === undefined || isAfterCursor({ id: s.id }, after))
      .sort((a, b) => (a.id < b.id ? 1 : -1))
      .slice(0, limit);
  }

  readonly sessionRepository: SessionRepository = {
    insertSession: (tx, session) => this.insertSession(tx, session),
    insertRefreshToken: (tx, token) => this.insertRefreshToken(tx, token),
    findRefreshTokenForUpdate: (tx, hash) => this.findRefreshTokenForUpdate(tx, hash),
    markRefreshTokenUsed: (tx, id, at) => this.markRefreshTokenUsed(tx, id, at),
    touchSession: (tx, id, lastUsedAt, expiresAt) =>
      this.touchSession(tx, id, lastUsedAt, expiresAt),
    revoke: (tx, id, reason, at) => this.revoke(tx, id, reason, at),
    revokeAllForUser: (tx, userId, reason, at) => this.revokeAllForUser(tx, userId, reason, at),
    findById: async (_tx, id) => this.state.sessions.get(id) ?? null,
    listActive: (tx, userId, now, after, limit) => this.listActive(tx, userId, now, after, limit),
  };

  readonly oneTimeTokenRepository: OneTimeTokenRepository = {
    insert: async (_tx, token) => {
      this.state.oneTimeTokens.set(token.id, token);
    },
    findByHashForUpdate: (tx, hash, purpose) => this.findByHashForUpdate(tx, hash, purpose),
    consume: (tx, id, at) => this.consume(tx, id, at),
    consumeAllForUser: (tx, userId, purpose, at) => this.consumeAllForUser(tx, userId, purpose, at),
  };
}

/** Correo en memoria (el de `src/infrastructure` no se puede importar desde application). */
export class RecordingEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }

  lastTo(to: string, template?: string): EmailMessage | undefined {
    return this.sent.findLast(
      (message) => message.to === to && (template === undefined || message.template === template),
    );
  }
}

/** Hash reversible y rápido: solo para tests de casos de uso (el real es Argon2id). */
export const fakePasswordHasher: PasswordHasher = {
  hash: async (password) => `fake$${password}`,
  verify: async (hash, password) => hash === `fake$${password}`,
};

/** Access token legible: `access:<userId>:<sessionId>:<ev>`. */
export const fakeAccessTokens: AccessTokenIssuer & { lastClaims?: AccessTokenClaims } = {
  async issue(claims, now) {
    this.lastClaims = claims;
    return {
      token: `access:${claims.userId}:${claims.sessionId}:${claims.emailVerified}`,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    };
  },
};

/** Google de mentira: cada ID token conocido se traduce a una identidad. */
export class FakeGoogleVerifier implements GoogleIdTokenVerifier {
  readonly tokens = new Map<string, GoogleIdentity>();
  async verify(idToken: string) {
    return this.tokens.get(idToken) ?? null;
  }
}

export const TERMS_VERSION = "2026-11-17";

export function memoryIdentityDeps(
  overrides: Partial<IdentityDeps> & { clock?: Clock } = {},
): IdentityDeps & {
  store: MemoryIdentityStore;
  mail: RecordingEmailSender;
  errors: unknown[];
} {
  const store = new MemoryIdentityStore();
  const mail = new RecordingEmailSender();
  const errors: unknown[] = [];
  return {
    store,
    mail,
    errors,
    unitOfWork: store,
    outbox: store,
    users: store,
    terms: store,
    externalAccounts: store,
    oneTimeTokens: store.oneTimeTokenRepository,
    sessions: store.sessionRepository,
    passwordHasher: fakePasswordHasher,
    breachedPasswords: { isBreached: async (password) => password === "password123456" },
    accessTokens: fakeAccessTokens,
    google: null,
    email: mail,
    clock: fixedClock(new Date("2026-11-17T10:00:00.000Z")),
    settings: { minSignupAge: 18, termsVersion: TERMS_VERSION, webAppUrl: "https://pawbook.test" },
    reportError: (error) => errors.push(error),
    ...overrides,
  };
}
