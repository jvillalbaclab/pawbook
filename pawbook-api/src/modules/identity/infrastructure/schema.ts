import { sql } from "drizzle-orm";
import { date, index, pgSchema, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { OneTimeTokenPurpose } from "../domain/one-time-token";
import type { RevocationReason } from "../domain/session";

/*
 * Esquema `identity` (arquitectura §8). IDs UUIDv7 generados en la app y `timestamptz`
 * (OR-DB-002). Los tokens se guardan solo como SHA-256 (ver `domain/opaque-token.ts`).
 */
export const identity = pgSchema("identity");

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = identity.table(
  "users",
  {
    id: uuid("id").primaryKey(),
    /** Normalizado a minúsculas por el dominio: el índice único es sobre el valor guardado. */
    email: text("email").notNull(),
    /** Argon2id en formato PHC. `null` en cuentas solo de Google. */
    passwordHash: text("password_hash"),
    birthDate: date("birth_date", { mode: "string" }).notNull(),
    emailVerifiedAt: timestamptz("email_verified_at"),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [uniqueIndex("users_email_key").on(table.email)],
);

/** Cuentas de proveedores externos vinculadas (hoy solo Google, FR-AUTH-003). */
export const externalAccounts = identity.table(
  "external_accounts",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").$type<"google">().notNull(),
    /** Claim `sub` del ID token: estable aunque el usuario cambie de correo en Google. */
    subject: text("subject").notNull(),
    createdAt: timestamptz("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("external_accounts_provider_subject_key").on(table.provider, table.subject),
    index("external_accounts_user_id_idx").on(table.userId),
  ],
);

/** Historial de aceptaciones de términos con versión y fecha (OR-LEG-001). Solo se inserta. */
export const termsAcceptances = identity.table(
  "terms_acceptances",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    acceptedAt: timestamptz("accepted_at").notNull(),
  },
  (table) => [index("terms_acceptances_user_id_idx").on(table.userId, table.id)],
);

/** Enlaces de verificación de correo y de recuperación de contraseña. */
export const oneTimeTokens = identity.table(
  "one_time_tokens",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose").$type<OneTimeTokenPurpose>().notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamptz("created_at").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    consumedAt: timestamptz("consumed_at"),
  },
  (table) => [
    uniqueIndex("one_time_tokens_token_hash_key").on(table.tokenHash),
    // Solo los pendientes: es lo que se invalida al pedir un enlace nuevo.
    index("one_time_tokens_pending_idx")
      .on(table.userId, table.purpose)
      .where(sql`${table.consumedAt} is null`),
  ],
);

/** Sesiones = familias de refresh tokens (FR-AUTH-004, FR-AUTH-007). */
export const sessions = identity.table(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    createdAt: timestamptz("created_at").notNull(),
    lastUsedAt: timestamptz("last_used_at").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    revokedAt: timestamptz("revoked_at"),
    revokedReason: text("revoked_reason").$type<RevocationReason>(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId, table.id)],
);

export const refreshTokens = identity.table(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamptz("created_at").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    usedAt: timestamptz("used_at"),
  },
  (table) => [
    uniqueIndex("refresh_tokens_token_hash_key").on(table.tokenHash),
    index("refresh_tokens_session_id_idx").on(table.sessionId),
  ],
);
