import { describe, expect, test } from "bun:test";
import { isValidHandle, suggestHandle } from "./registration";

describe("isValidHandle", () => {
  test("acepta minúsculas, números, punto y guion bajo", () => {
    expect(isValidHandle("luna.gata_2")).toBe(true);
  });

  test("respeta los límites de longitud", () => {
    expect(isValidHandle("ab")).toBe(false);
    expect(isValidHandle("abc")).toBe(true);
    expect(isValidHandle("a".repeat(30))).toBe(true);
    expect(isValidHandle("a".repeat(31))).toBe(false);
  });

  test("rechaza mayúsculas, espacios y símbolos", () => {
    for (const handle of ["Luna", "lu na", "luna!", "luna-gata"])
      expect(isValidHandle(handle)).toBe(false);
  });
});

describe("suggestHandle", () => {
  test("quita tildes, espacios y mayúsculas", () => {
    expect(suggestHandle("Tomás Junior", "dog")).toBe("tomasjunior.perro");
  });

  test("usa el sufijo de la especie", () => {
    expect(suggestHandle("Luna", "cat")).toBe("luna.gato");
  });

  test("devuelve vacío si el nombre no tiene caracteres válidos", () => {
    expect(suggestHandle("¡¡!!", "cat")).toBe("");
  });
});
