import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { JsonObject } from "../../../shared/events";

/*
 * Esquema `platform` (arquitectura §8): piezas transversales que no pertenecen a ningún
 * módulo de negocio. IDs UUIDv7 generados en la app y fechas `timestamptz` (OR-DB-002).
 */
export const platform = pgSchema("platform");

/** Eventos de dominio pendientes de publicar. Se escriben en la transacción del cambio. */
export const outbox = platform.table(
  "outbox",
  {
    id: uuid("id").primaryKey(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<JsonObject>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    /** Intentos de publicación fallidos; el relay deja de insistir al llegar al máximo. */
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
  },
  (table) => [
    // Parcial: solo indexa lo pendiente, así el relay no recorre el histórico publicado.
    // Ordenar por `id` (UUIDv7) equivale a ordenar por momento de inserción.
    index("outbox_unpublished_idx").on(table.id).where(sql`${table.publishedAt} is null`),
  ],
);

/** Eventos entrantes ya procesados, para descartar reentregas (webhooks, reintentos). */
export const inboxEvents = platform.table(
  "inbox_events",
  {
    id: uuid("id").primaryKey(),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("inbox_events_source_external_id_key").on(table.source, table.externalId),
  ],
);
