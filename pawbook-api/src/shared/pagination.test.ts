import { describe, expect, test } from "bun:test";
import { fixedClock } from "./clock";
import { AppError } from "./errors";
import { uuidv7 } from "./ids";
import { decodeCursor, encodeCursor, fetchSize, isAfterCursor, toPage } from "./pagination";

describe("cursor", () => {
  test("ida y vuelta conserva la posición", () => {
    const id = uuidv7();
    expect(decodeCursor(encodeCursor({ id }))).toEqual({ id });
    expect(decodeCursor(encodeCursor({ id, sortKey: 42 }))).toEqual({ id, sortKey: 42 });
    expect(decodeCursor(encodeCursor({ id, sortKey: "2026-01-01" }))).toEqual({
      id,
      sortKey: "2026-01-01",
    });
  });

  test("es base64url opaco (seguro en una query string)", () => {
    expect(encodeCursor({ id: uuidv7() })).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test.each([
    ["no es base64url", "%%%"],
    ["no es JSON", Buffer.from("hola").toString("base64url")],
    ["JSON con otra forma", Buffer.from('{"v":1,"id":"x"}').toString("base64url")],
    ["versión desconocida", Buffer.from(`{"v":2,"id":"${uuidv7()}"}`).toString("base64url")],
    ["demasiado largo", "a".repeat(513)],
  ])("un cursor corrupto (%s) lanza 400", (_, cursor) => {
    try {
      decodeCursor(cursor);
      throw new Error("debería haber fallado");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(400);
    }
  });
});

describe("keyset", () => {
  // Filas con UUIDv7 creadas en orden cronológico, servidas de la más reciente a la más antigua.
  const clock = fixedClock(new Date("2026-01-01T00:00:00Z"));
  const rows = Array.from({ length: 5 }, (_, n) => {
    clock.advance(1);
    return { id: uuidv7(clock), n };
  }).reverse();

  function page(cursor: string | undefined, limit: number) {
    const after = cursor === undefined ? undefined : decodeCursor(cursor);
    const candidates = rows.filter((row) => after === undefined || isAfterCursor(row, after));
    return toPage(candidates.slice(0, fetchSize(limit)), limit, (row) => ({ id: row.id }));
  }

  test("recorre todas las filas sin repetir ni saltarse ninguna", () => {
    const seen: number[] = [];
    let cursor: string | undefined;
    do {
      const result = page(cursor, 2);
      seen.push(...result.items.map((row) => row.n));
      cursor = result.nextCursor ?? undefined;
    } while (cursor !== undefined);
    expect(seen).toEqual([4, 3, 2, 1, 0]);
  });

  test("la última página tiene nextCursor null", () => {
    expect(page(undefined, 5).nextCursor).toBeNull();
    expect(page(undefined, 4).nextCursor).not.toBeNull();
  });

  test("con sortKey desempata por id", () => {
    const [a, b] = [uuidv7(), uuidv7()].sort();
    if (a === undefined || b === undefined) throw new Error("faltan ids");
    expect(isAfterCursor({ id: b, sortKey: 5 }, { id: a, sortKey: 10 })).toBe(true);
    expect(isAfterCursor({ id: a, sortKey: 10 }, { id: b, sortKey: 10 })).toBe(true);
    expect(isAfterCursor({ id: b, sortKey: 10 }, { id: a, sortKey: 10 })).toBe(false);
  });
});
