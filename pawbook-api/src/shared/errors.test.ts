import { describe, expect, test } from "bun:test";
import { AppError, toProblem } from "./errors";

describe("toProblem", () => {
  test("traduce un AppError a RFC 9457 con su estado y tipo estable", () => {
    const error = new AppError("conflict", { detail: "El @handle ya está en uso." });
    expect(toProblem(error, { instance: "/v1/pets", requestId: "req-1" })).toEqual({
      type: "https://pawbook.app/problems/conflict",
      title: "La solicitud entra en conflicto con el estado actual",
      status: 409,
      detail: "El @handle ya está en uso.",
      instance: "/v1/pets",
      requestId: "req-1",
    });
  });

  test("incluye los errores por campo de una validación", () => {
    const error = new AppError("validation-failed", {
      errors: [{ path: "name", message: "Obligatorio" }],
    });
    const problem = toProblem(error);
    expect(problem.status).toBe(422);
    expect(problem.errors).toEqual([{ path: "name", message: "Obligatorio" }]);
  });

  test("oculta el mensaje de errores desconocidos tras un 500 genérico", () => {
    const problem = toProblem(new Error('relation "users" does not exist'));
    expect(problem.status).toBe(500);
    expect(problem.type).toBe("https://pawbook.app/problems/internal-error");
    expect(JSON.stringify(problem)).not.toContain("relation");
  });

  test("tolera valores lanzados que no son Error", () => {
    expect(toProblem("texto suelto").status).toBe(500);
  });
});
