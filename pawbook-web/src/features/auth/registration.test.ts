import { describe, expect, test } from "bun:test";
import {
  isValidHandle,
  MIN_PASSWORD_LENGTH,
  suggestHandle,
  validateRegistration,
} from "./registration";

const valid = { email: "laura@correo.com", password: "segura123", acceptedTerms: true };

describe("validateRegistration", () => {
  test("sin errores cuando todo es válido", () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  test("rechaza correos mal formados", () => {
    for (const email of ["", "laura", "laura@", "laura@correo", "la ura@correo.com"]) {
      expect(validateRegistration({ ...valid, email }).email).toBeDefined();
    }
  });

  test("acepta un correo con espacios alrededor", () => {
    expect(validateRegistration({ ...valid, email: "  laura@correo.com " }).email).toBeUndefined();
  });

  test("exige la longitud mínima de contraseña, ni un carácter menos", () => {
    expect(
      validateRegistration({ ...valid, password: "a".repeat(MIN_PASSWORD_LENGTH - 1) }).password,
    ).toBeDefined();
    expect(
      validateRegistration({ ...valid, password: "a".repeat(MIN_PASSWORD_LENGTH) }).password,
    ).toBeUndefined();
  });

  test("exige aceptar términos y edad mínima", () => {
    expect(validateRegistration({ ...valid, acceptedTerms: false }).acceptedTerms).toBeDefined();
  });

  test("devuelve todos los errores a la vez", () => {
    expect(
      Object.keys(validateRegistration({ email: "", password: "", acceptedTerms: false })).sort(),
    ).toEqual(["acceptedTerms", "email", "password"]);
  });
});

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
