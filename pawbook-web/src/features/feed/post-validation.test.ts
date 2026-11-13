import { describe, expect, test } from "bun:test";
import { MAX_POST_LENGTH, validatePostText } from "./post-validation";

describe("validatePostText", () => {
  test("acepta texto vacío y texto normal", () => {
    expect(validatePostText("")).toBeNull();
    expect(validatePostText("Primer día en el parque")).toBeNull();
  });

  test("acepta exactamente el máximo", () => {
    expect(validatePostText("a".repeat(MAX_POST_LENGTH))).toBeNull();
  });

  test("rechaza un carácter por encima del máximo", () => {
    expect(validatePostText("a".repeat(MAX_POST_LENGTH + 1))).toContain("supera");
  });
});
