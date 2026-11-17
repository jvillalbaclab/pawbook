import { type Clock, systemClock } from "./clock";
import type { Uuid } from "./ids";
import type { Transaction } from "./unit-of-work";

/*
 * Eventos de dominio (arquitectura §4.2 y §8). Un módulo los emite cuando algo relevante ya
 * ocurrió (`pawmates.match-created`) y otros reaccionan sin acoplarse a él. Viajan por el
 * outbox, así que el payload tiene que sobrevivir a JSON: nada de `Date`, `Map` ni clases.
 * Este archivo no conoce Drizzle ni pg-boss; los adaptadores viven en `src/infrastructure`.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Payload de un evento. Declárelo con `type` (no `interface`) para que encaje en esta firma. */
export type JsonObject = { [key: string]: JsonValue };

export interface DomainEvent<
  TType extends string = string,
  TPayload extends JsonObject = JsonObject,
> {
  /** Nombre estable `<módulo>.<hecho-en-pasado>`; también da nombre a las colas de pg-boss. */
  readonly type: TType;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}

/** Mismo formato que exige pg-boss para los nombres de cola. */
const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/;

/**
 * Crea un evento con la fecha del reloj inyectado. Ejemplo:
 * `type MatchCreated = DomainEvent<"pawmates.match-created", { matchId: string }>`.
 */
export function domainEvent<TType extends string, TPayload extends JsonObject>(
  type: TType,
  payload: TPayload,
  clock: Clock = systemClock,
): DomainEvent<TType, TPayload> {
  if (!EVENT_TYPE_PATTERN.test(type)) {
    throw new Error(`Tipo de evento inválido: "${type}". Formato esperado: modulo.hecho-ocurrido`);
  }
  return { type, occurredAt: clock.now(), payload };
}

/** Evento tal como lo recibe un handler: con el ID que le asignó el outbox. */
export type DeliveredEvent<E extends DomainEvent = DomainEvent> = E & { readonly id: Uuid };

/**
 * Reacción a un tipo de evento. Cada handler tiene su propia cola, así que reintentar uno no
 * vuelve a ejecutar los demás. La entrega es "al menos una vez": si el efecto no es idempotente
 * por sí mismo, envuélvalo en `Inbox.processOnce("outbox", event.id, ...)`.
 */
export interface EventHandler<E extends DomainEvent = DomainEvent> {
  readonly eventType: E["type"];
  /** Nombre del consumidor (`notifications.send-match-email`); debe ser único por evento. */
  readonly name: string;
  // Sintaxis de método a propósito: permite guardar handlers de eventos distintos en una lista.
  handle(event: DeliveredEvent<E>): Promise<void>;
}

/**
 * Puerto del outbox. `enqueue` escribe en la misma transacción que el cambio de dominio: si la
 * transacción hace rollback, el evento desaparece con ella; si confirma, el worker lo publicará.
 */
export interface EventOutbox {
  enqueue(tx: Transaction, events: readonly DomainEvent[]): Promise<void>;
}
