import { describe, expect, test } from "bun:test";
import { nextTheme, parseTheme } from "./theme";

describe("tema", () => {
  test("alterna entre claro y oscuro", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });

  test("cualquier valor desconocido se trata como claro", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("sepia")).toBe("light");
    expect(parseTheme(null)).toBe("light");
    expect(parseTheme(undefined)).toBe("light");
  });
});
