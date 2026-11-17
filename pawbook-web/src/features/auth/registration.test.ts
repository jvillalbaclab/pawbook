import { describe, expect, test } from "bun:test";
import { suggestHandle } from "./registration";

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
