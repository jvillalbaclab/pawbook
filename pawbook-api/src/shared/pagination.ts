import { z } from "zod";
import { AppError } from "./errors";
import { isUuidV7, type Uuid } from "./ids";

/*
 * Paginación keyset por cursor (COM-004), independiente del ORM: estas funciones trabajan con
 * filas ya leídas. El repositorio ordena por `(sortKey DESC, id DESC)` —o solo `id DESC`, que
 * al ser UUIDv7 es orden cronológico con resolución de milisegundo (dentro del mismo ms el orden
 * es arbitrario pero estable, que es lo único que necesita el keyset)—, filtra las filas
 * posteriores al cursor y pide
 * `limit + 1` filas para saber si hay página siguiente sin un COUNT.
 *
 * SQL equivalente: `WHERE (sort_key, id) < ($sortKey, $id) ORDER BY sort_key DESC, id DESC
 * LIMIT $limit + 1` (o `WHERE id < $id ORDER BY id DESC` si no hay `sortKey`).
 */

/** Posición de la última fila servida. `sortKey` solo hace falta si no se ordena por `id`. */
export type CursorPosition = {
  readonly id: Uuid;
  readonly sortKey?: string | number;
};

/** Un cursor válido mide bastante menos; se corta antes de decodificar entradas enormes. */
const MAX_CURSOR_LENGTH = 512;
const CURSOR_VERSION = 1;

const CursorPayloadSchema = z.object({
  v: z.literal(CURSOR_VERSION),
  id: z.string().refine(isUuidV7),
  k: z.union([z.string(), z.number().finite()]).optional(),
});

/** Cursor opaco: JSON versionado en base64url. El cliente no debe interpretarlo. */
export function encodeCursor(position: CursorPosition): string {
  const payload: z.infer<typeof CursorPayloadSchema> = { v: CURSOR_VERSION, id: position.id };
  if (position.sortKey !== undefined) payload.k = position.sortKey;
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/** Decodifica un cursor recibido del cliente. Si está corrupto lanza 400, nunca un 500. */
export function decodeCursor(cursor: string): CursorPosition {
  const invalid = () =>
    new AppError("bad-request", { detail: "El cursor de paginación no es válido." });
  if (cursor.length > MAX_CURSOR_LENGTH || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw invalid();

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw invalid();
  }
  const parsed = CursorPayloadSchema.safeParse(json);
  if (!parsed.success) throw invalid();
  const position: { id: Uuid; sortKey?: string | number } = { id: parsed.data.id as Uuid };
  if (parsed.data.k !== undefined) position.sortKey = parsed.data.k;
  return position;
}

/** Filas a pedir al repositorio: una de más para detectar si hay página siguiente. */
export function fetchSize(limit: number): number {
  return limit + 1;
}

/**
 * Recorta las `limit + 1` filas leídas a `limit` y calcula `nextCursor` a partir de la última
 * fila servida. `toPosition` extrae de cada fila las columnas por las que se ordena.
 */
export function toPage<Row>(
  rows: readonly Row[],
  limit: number,
  toPosition: (row: Row) => CursorPosition,
): { items: Row[]; nextCursor: string | null } {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  const hasMore = rows.length > limit;
  return {
    items,
    nextCursor: hasMore && last !== undefined ? encodeCursor(toPosition(last)) : null,
  };
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

/**
 * `true` si `position` va después de `cursor` en orden `(sortKey DESC, id DESC)`. Sirve para
 * adaptadores en memoria (tests, fakes); en Postgres el mismo filtro es el `WHERE` de arriba.
 * Los UUIDv7 en minúsculas se comparan bien como texto: el orden lexicográfico es el temporal.
 */
export function isAfterCursor(position: CursorPosition, cursor: CursorPosition): boolean {
  if (cursor.sortKey !== undefined && position.sortKey !== undefined) {
    const bySortKey = compare(position.sortKey, cursor.sortKey);
    if (bySortKey !== 0) return bySortKey < 0;
  }
  return position.id < cursor.id;
}
