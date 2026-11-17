import type { Clock } from "../../../shared/clock";
import type { EmailSender } from "../../../shared/email";
import type { EventOutbox } from "../../../shared/events";
import type { Uuid } from "../../../shared/ids";
import type { CursorPosition } from "../../../shared/pagination";
import type { Transaction, UnitOfWork } from "../../../shared/unit-of-work";
import type { OneTimeToken, OneTimeTokenPurpose } from "../domain/one-time-token";
import type { RefreshToken, RevocationReason, Session } from "../domain/session";
import type { User } from "../domain/user";

/*
 * Puertos de identity. Los casos de uso solo conocen estas interfaces; los adaptadores
 * (Drizzle, Argon2id, jose, HIBP) viven en `infrastructure/` y se conectan en la composición.
 * Todo acceso a datos recibe la transacción de `UnitOfWork.run`.
 */

export type TermsAcceptance = {
  readonly id: Uuid;
  readonly userId: Uuid;
  readonly version: string;
  readonly acceptedAt: Date;
};

export interface UserRepository {
  findByEmail(tx: Transaction, email: string): Promise<User | null>;
  findById(tx: Transaction, id: Uuid): Promise<User | null>;
  /** `email-taken` si otro registro concurrente ganó la carrera por el mismo correo. */
  insert(tx: Transaction, user: User): Promise<"inserted" | "email-taken">;
  markEmailVerified(tx: Transaction, userId: Uuid, at: Date): Promise<void>;
  /** `null` elimina la contraseña (la cuenta queda solo con Google). */
  updatePasswordHash(tx: Transaction, userId: Uuid, passwordHash: string | null): Promise<void>;
}

export interface TermsAcceptanceRepository {
  record(tx: Transaction, acceptance: TermsAcceptance): Promise<void>;
  latest(tx: Transaction, userId: Uuid): Promise<TermsAcceptance | null>;
}

export type ExternalProvider = "google";

export interface ExternalAccountRepository {
  findUserId(tx: Transaction, provider: ExternalProvider, subject: string): Promise<Uuid | null>;
  link(
    tx: Transaction,
    account: {
      id: Uuid;
      userId: Uuid;
      provider: ExternalProvider;
      subject: string;
      createdAt: Date;
    },
  ): Promise<void>;
}

export interface OneTimeTokenRepository {
  insert(tx: Transaction, token: OneTimeToken): Promise<void>;
  /** Bloquea la fila (`FOR UPDATE`) para que dos usos simultáneos no consuman el mismo token. */
  findByHashForUpdate(
    tx: Transaction,
    tokenHash: string,
    purpose: OneTimeTokenPurpose,
  ): Promise<OneTimeToken | null>;
  consume(tx: Transaction, id: Uuid, at: Date): Promise<void>;
  /** Invalida los enlaces pendientes del usuario (p. ej. al pedir uno nuevo). */
  consumeAllForUser(
    tx: Transaction,
    userId: Uuid,
    purpose: OneTimeTokenPurpose,
    at: Date,
  ): Promise<void>;
}

export interface SessionRepository {
  insertSession(tx: Transaction, session: Session): Promise<void>;
  insertRefreshToken(tx: Transaction, token: RefreshToken): Promise<void>;
  /** Busca por hash y bloquea token y sesión: dos refresh simultáneos se serializan. */
  findRefreshTokenForUpdate(
    tx: Transaction,
    tokenHash: string,
  ): Promise<{ token: RefreshToken; session: Session } | null>;
  markRefreshTokenUsed(tx: Transaction, tokenId: Uuid, at: Date): Promise<void>;
  touchSession(tx: Transaction, sessionId: Uuid, lastUsedAt: Date, expiresAt: Date): Promise<void>;
  revoke(tx: Transaction, sessionId: Uuid, reason: RevocationReason, at: Date): Promise<void>;
  revokeAllForUser(
    tx: Transaction,
    userId: Uuid,
    reason: RevocationReason,
    at: Date,
  ): Promise<void>;
  findById(tx: Transaction, sessionId: Uuid): Promise<Session | null>;
  /** Sesiones activas en orden `id DESC`, después de `after` si se indica. */
  listActive(
    tx: Transaction,
    userId: Uuid,
    now: Date,
    after: CursorPosition | undefined,
    limit: number,
  ): Promise<Session[]>;
}

/** Hash de contraseñas con Argon2id (NFR-SEC-002). */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
}

/** Comprueba la contraseña contra listas de contraseñas filtradas (FR-AUTH-001). */
export interface BreachedPasswordChecker {
  isBreached(password: string): Promise<boolean>;
}

export type AccessTokenClaims = {
  readonly userId: Uuid;
  readonly sessionId: Uuid;
  readonly emailVerified: boolean;
};

export interface AccessTokenIssuer {
  issue(claims: AccessTokenClaims, now: Date): Promise<{ token: string; expiresAt: Date }>;
}

/** Identidad que Google afirma en un ID token ya verificado (firma, emisor, audiencia, caducidad). */
export type GoogleIdentity = {
  readonly subject: string;
  readonly email: string;
  readonly emailVerified: boolean;
};

export interface GoogleIdTokenVerifier {
  /** `null` si el token no es válido. Lanza solo si Google no responde (JWKS inaccesible). */
  verify(idToken: string): Promise<GoogleIdentity | null>;
}

/** Configuración de negocio del módulo, leída del entorno en la composición. */
export type IdentitySettings = {
  /** Edad mínima de registro. Provisional hasta la decisión T-F0.02 (PRD Q2). */
  readonly minSignupAge: number;
  /** Versión vigente de los términos y la política de privacidad (OR-LEG-001). */
  readonly termsVersion: string;
  /** URL de la web, para construir los enlaces de los correos. */
  readonly webAppUrl: string;
};

export type IdentityDeps = {
  readonly unitOfWork: UnitOfWork;
  readonly outbox: EventOutbox;
  readonly users: UserRepository;
  readonly terms: TermsAcceptanceRepository;
  readonly externalAccounts: ExternalAccountRepository;
  readonly oneTimeTokens: OneTimeTokenRepository;
  readonly sessions: SessionRepository;
  readonly passwordHasher: PasswordHasher;
  readonly breachedPasswords: BreachedPasswordChecker;
  readonly accessTokens: AccessTokenIssuer;
  /** `null` si Google no está configurado: el endpoint responde "deshabilitado". */
  readonly google: GoogleIdTokenVerifier | null;
  readonly email: EmailSender;
  readonly clock: Clock;
  readonly settings: IdentitySettings;
  /** Informa de un fallo no fatal (p. ej. el correo no salió). `context` nunca lleva PII. */
  readonly reportError: (error: unknown, context: Record<string, string>) => void;
};
