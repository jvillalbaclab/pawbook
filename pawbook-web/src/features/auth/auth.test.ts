import { describe, expect, test } from "bun:test";
import type { Me } from "@pawbook/contracts";
import { ApiError, parseRetryAfter, problemCodeOf, toApiError } from "@/lib/api-client/problem";
import { tokenFromHash } from "./fragment-token";
import { decideAccess, returnPathFromSearch, safeReturnPath, signInUrl } from "./guards";
import { apiFieldErrors, problemMessage } from "./messages";
import {
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateNewPassword,
  validateSignIn,
  validateSignUp,
} from "./validation";

const user = (emailVerified: boolean): Me => ({
  id: "0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e61",
  email: "ana@example.com",
  status: emailVerified ? "active" : "pending_verification",
  emailVerified,
  birthDate: "1995-04-23",
  createdAt: "2026-11-17T10:00:00.000Z",
  termsAcceptance: null,
});

describe("guardas de ruta", () => {
  test("espera mientras la sesión se comprueba", () => {
    expect(decideAccess({ status: "unknown", user: null }, "session", "/")).toEqual({
      kind: "wait",
    });
  });

  test("sin sesión, lleva al login conservando la ruta de vuelta", () => {
    expect(
      decideAccess({ status: "anonymous", user: null }, "session", "/mensajes/kira?x=1"),
    ).toEqual({ kind: "redirect", to: "/entrar?volver=%2Fmensajes%2Fkira%3Fx%3D1" });
    expect(signInUrl("/")).toBe("/entrar");
  });

  test("con sesión deja pasar aunque el correo no esté verificado", () => {
    expect(decideAccess({ status: "authenticated", user: user(false) }, "session", "/")).toEqual({
      kind: "allow",
    });
  });

  test("si se exige correo verificado, sin verificar lleva a «Revisa tu correo»", () => {
    expect(
      decideAccess({ status: "authenticated", user: user(false) }, "verified-email", "/"),
    ).toEqual({ kind: "redirect", to: "/registro/revisa-tu-correo" });
    expect(
      decideAccess({ status: "authenticated", user: user(true) }, "verified-email", "/"),
    ).toEqual({ kind: "allow" });
  });

  test("la ruta de vuelta solo admite rutas internas", () => {
    expect(safeReturnPath("/pawmates")).toBe("/pawmates");
    for (const unsafe of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "pawmates",
      "",
      null,
    ]) {
      expect(safeReturnPath(unsafe)).toBe("/");
    }
    expect(returnPathFromSearch("?volver=%2Fmensajes")).toBe("/mensajes");
    expect(returnPathFromSearch("?volver=https%3A%2F%2Fevil.test")).toBe("/");
  });
});

describe("validación de formularios con el contrato", () => {
  const valid = {
    email: " ana@example.com ",
    password: "a".repeat(PASSWORD_MIN_LENGTH),
    birthDate: "1995-04-23",
    acceptedTerms: true,
  };

  test("registro válido: devuelve la solicitud del contrato con el correo recortado", () => {
    expect(validateSignUp(valid, "2026-11-17")).toEqual({
      ok: true,
      value: {
        email: "ana@example.com",
        password: valid.password,
        birthDate: "1995-04-23",
        termsVersion: "2026-11-17",
      },
    });
  });

  test("registro: la longitud mínima es la del contrato (10), ni un carácter menos", () => {
    const short = validateSignUp({ ...valid, password: "a".repeat(PASSWORD_MIN_LENGTH - 1) }, "v");
    expect(short).toEqual({ ok: false, errors: { password: "password-too-short" } });
    expect(validateSignUp({ ...valid, password: "a".repeat(129) }, "v")).toEqual({
      ok: false,
      errors: { password: "password-too-long" },
    });
  });

  test("registro: devuelve todos los errores a la vez", () => {
    const result = validateSignUp(
      { email: "ana", password: "", birthDate: "23/04/1995", acceptedTerms: false },
      "v",
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        email: "email-invalid",
        password: "password-too-short",
        birthDate: "birth-date-invalid",
        acceptedTerms: "terms-required",
      },
    });
  });

  test("login: no aplica la política de contraseña, solo que no esté vacía", () => {
    expect(validateSignIn({ email: "ana@example.com", password: "corta" }).ok).toBe(true);
    expect(validateSignIn({ email: "ana@example.com", password: "" })).toEqual({
      ok: false,
      errors: { password: "password-required" },
    });
  });

  test("recuperación y contraseña nueva", () => {
    expect(validateEmail({ email: "x" })).toEqual({
      ok: false,
      errors: { email: "email-invalid" },
    });
    const password = "una frase larga";
    expect(validateNewPassword({ password, confirmation: password })).toEqual({
      ok: true,
      value: password,
    });
    expect(validateNewPassword({ password, confirmation: "otra" })).toEqual({
      ok: false,
      errors: { confirmation: "passwords-mismatch" },
    });
  });
});

describe("errores de la API", () => {
  test("el código sale del type estable del problem", () => {
    expect(problemCodeOf("https://pawbook.app/problems/link-expired")).toBe("link-expired");
    expect(problemCodeOf("https://otro.test/problems/link-expired")).toBe("unknown");
    expect(problemCodeOf(undefined)).toBe("unknown");
  });

  test("Retry-After en segundos o como fecha HTTP", () => {
    expect(parseRetryAfter("30")).toBe(30);
    expect(parseRetryAfter(null)).toBeUndefined();
    const now = Date.parse("2026-11-17T10:00:00Z");
    expect(parseRetryAfter("Tue, 17 Nov 2026 10:01:00 GMT", now)).toBe(60);
  });

  test("un 429 lleva los segundos de espera al mensaje", () => {
    const response = new Response(null, { status: 429, headers: { "Retry-After": "42" } });
    const error = toApiError(response, {
      type: "https://pawbook.app/problems/rate-limited",
      status: 429,
    });
    expect(error.retryAfterSeconds).toBe(42);
    expect(problemMessage(error)).toEqual({
      key: "problems.rateLimitedWait",
      values: { seconds: 42 },
    });
  });

  test("401 es «credenciales incorrectas» solo en el login y nunca dice si el correo existe", () => {
    const error = new ApiError({ status: 401, code: "unauthorized" });
    expect(problemMessage(error, "sign-in")).toEqual({ key: "problems.invalidCredentials" });
    expect(problemMessage(error)).toEqual({ key: "problems.generic" });
  });

  test("mensajes por type: enlace caducado, no válido, proveedor desactivado y red", () => {
    const of = (code: ApiError["code"]) => problemMessage(new ApiError({ status: 400, code }));
    expect(of("link-expired").key).toBe("problems.linkExpired");
    expect(of("invalid-link").key).toBe("problems.invalidLink");
    expect(of("auth-provider-disabled").key).toBe("problems.providerDisabled");
    expect(of("network-error").key).toBe("problems.network");
    expect(problemMessage(new Error("x")).key).toBe("problems.generic");
  });

  test("errors[] se reparte entre los campos del formulario", () => {
    const error = new ApiError({
      status: 422,
      code: "validation-failed",
      fieldErrors: { termsVersion: "No es la versión vigente", other: "x" },
    });
    expect(apiFieldErrors(error, { termsVersion: "acceptedTerms" })).toEqual({
      acceptedTerms: "No es la versión vigente",
    });
  });
});

describe("token de los enlaces de correo", () => {
  test("se lee del fragmento #token=", () => {
    expect(tokenFromHash("#token=abc_123")).toBe("abc_123");
    expect(tokenFromHash("")).toBeNull();
    expect(tokenFromHash("#token=")).toBeNull();
  });
});
