import { describe, expect, test } from "bun:test";
import { fixedClock } from "./clock";
import { isUuidV7, uuidv7, uuidv7Timestamp } from "./ids";

describe("uuidv7", () => {
  test("genera un UUID versión 7 con variante RFC 9562", () => {
    const id = uuidv7();
    expect(isUuidV7(id)).toBe(true);
    expect(id[14]).toBe("7");
    expect("89ab").toContain(id[19] ?? "");
  });

  test("codifica el milisegundo del reloj inyectado", () => {
    const instant = new Date("2026-11-13T10:20:30.456Z");
    expect(uuidv7Timestamp(uuidv7(fixedClock(instant)))).toEqual(instant);
  });

  test("conserva timestamps más allá de 32 bits sin desbordar", () => {
    const farFuture = new Date("9999-12-31T23:59:59.999Z");
    expect(uuidv7Timestamp(uuidv7(fixedClock(farFuture)))).toEqual(farFuture);
  });

  test("los IDs de milisegundos distintos se ordenan por tiempo", () => {
    const clock = fixedClock(new Date("2026-01-01T00:00:00Z"));
    const ids = Array.from({ length: 50 }, () => {
      clock.advance(1);
      return uuidv7(clock);
    });
    expect([...ids].sort()).toEqual(ids);
  });

  test("no repite IDs en el mismo milisegundo", () => {
    const clock = fixedClock(new Date("2026-01-01T00:00:00Z"));
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv7(clock)));
    expect(ids.size).toBe(1000);
  });

  test("rechaza UUIDs de otras versiones", () => {
    expect(isUuidV7(crypto.randomUUID())).toBe(false);
    expect(isUuidV7("no-es-un-uuid")).toBe(false);
  });
});
