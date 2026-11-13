import { type Clock, systemClock } from "./clock";

/*
 * Identificadores UUIDv7 (RFC 9562, OR-DB-002): 48 bits de milisegundos Unix seguidos de
 * bits aleatorios. Al ordenarse por tiempo, los índices B-tree de Postgres no se fragmentan
 * como con UUIDv4. Se genera aquí y no en la base de datos para poder crear el ID antes de
 * persistir (útil para el outbox y para la idempotencia).
 */

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type Uuid = string & { readonly __brand: "Uuid" };

export function uuidv7(clock: Clock = systemClock): Uuid {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const ms = clock.now().getTime();

  // 48 bits de timestamp en big-endian. Se divide en dos partes porque los operadores
  // de bits de JavaScript trabajan con 32 bits.
  const high = Math.floor(ms / 2 ** 16);
  const low = ms % 2 ** 16;
  bytes[0] = (high >>> 24) & 0xff;
  bytes[1] = (high >>> 16) & 0xff;
  bytes[2] = (high >>> 8) & 0xff;
  bytes[3] = high & 0xff;
  bytes[4] = (low >>> 8) & 0xff;
  bytes[5] = low & 0xff;

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70; // versión 7
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variante RFC 9562

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as Uuid;
}

export function isUuidV7(value: string): value is Uuid {
  return UUID_V7_PATTERN.test(value);
}

/** Recupera el instante de creación codificado en un UUIDv7. */
export function uuidv7Timestamp(id: Uuid): Date {
  const hex = id.replaceAll("-", "").slice(0, 12);
  return new Date(Number.parseInt(hex, 16));
}
