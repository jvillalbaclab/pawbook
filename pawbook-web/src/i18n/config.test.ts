import { describe, expect, test } from "bun:test";
import { DEFAULT_LOCALE, resolveFormatLocale } from "./config";

describe("resolveFormatLocale", () => {
  test("sin configurar usa el español neutro", () => {
    expect(resolveFormatLocale(undefined)).toBe("es");
    expect(resolveFormatLocale("")).toBe(DEFAULT_LOCALE);
  });

  test("admite y normaliza variantes regionales del español", () => {
    expect(resolveFormatLocale("es-ES")).toBe("es-ES");
    expect(resolveFormatLocale("es-co")).toBe("es-CO");
  });

  test("rechaza idiomas sin catálogo y etiquetas inválidas", () => {
    expect(resolveFormatLocale("en-US")).toBe("es");
    expect(resolveFormatLocale("no es un locale")).toBe("es");
  });
});
