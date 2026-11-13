import { describe, expect, test } from "bun:test";
import { isActivePath } from "./nav-items";

describe("isActivePath", () => {
  test("Inicio solo está activo en la raíz exacta", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/adopcion", "/")).toBe(false);
  });

  test("una sección incluye sus subrutas", () => {
    expect(isActivePath("/mensajes/kira", "/mensajes")).toBe(true);
    expect(isActivePath("/adopcion", "/adopcion")).toBe(true);
  });

  test("no confunde prefijos parecidos", () => {
    expect(isActivePath("/pawmatesx", "/pawmates")).toBe(false);
  });
});
