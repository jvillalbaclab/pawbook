import { describe, expect, test } from "bun:test";
import type { HandleAvailability } from "@pawbook/contracts";
import { ApiError } from "@/lib/api-client/problem";
import { fakeScheduler, flush } from "../../../test/fake-scheduler";
import {
  buildCreatePetRequest,
  createHandleChecker,
  createIdempotencyKeys,
  type HandleStatus,
  handleStatusError,
  isHandleFormatValid,
  mapCreatePetError,
  normalizeHandle,
  type PetFormValues,
} from "./create-pet";

/*
 * Paso 2 del onboarding: disponibilidad del @handle (debounce y cancelación), Idempotency-Key
 * por intento y reparto de los errores de la API entre los campos.
 */

describe("formato del handle", () => {
  test("normaliza como la API: sin @, sin espacios y en minúsculas", () => {
    expect(normalizeHandle("  @Luna.Gata ")).toBe("luna.gata");
  });

  test("acepta [a-z0-9_.] de 3 a 30 con al menos una letra o un dígito", () => {
    expect(isHandleFormatValid("luna.gata_2")).toBe(true);
    expect(isHandleFormatValid("abc")).toBe(true);
    expect(isHandleFormatValid("a".repeat(30))).toBe(true);
    for (const handle of ["ab", "a".repeat(31), "lu na", "luna-gata", "Luna", "...", "_._"]) {
      expect(isHandleFormatValid(handle)).toBe(false);
    }
  });
});

describe("comprobación de disponibilidad", () => {
  function setup() {
    const clock = fakeScheduler();
    const calls: {
      handle: string;
      signal: AbortSignal;
      resolve: (r: HandleAvailability) => void;
    }[] = [];
    const statuses: HandleStatus[] = [];
    const checker = createHandleChecker({
      delayMs: 400,
      schedule: clock.schedule,
      onStatus: (status) => statuses.push(status),
      check: (handle, signal) =>
        new Promise((resolve) => {
          calls.push({ handle, signal, resolve });
        }),
    });
    return { clock, calls, statuses, checker };
  }

  test("espera a que se deje de escribir: una sola solicitud por ráfaga", () => {
    const { clock, calls, checker } = setup();
    checker.update("lun");
    clock.advance(200);
    checker.update("luna");
    clock.advance(200);
    checker.update("luna.g");
    clock.advance(399);
    expect(calls).toHaveLength(0);
    clock.advance(1);
    expect(calls.map((call) => call.handle)).toEqual(["luna.g"]);
  });

  test("al cambiar el texto cancela la solicitud en vuelo e ignora su respuesta", async () => {
    const { clock, calls, statuses, checker } = setup();
    checker.update("luna");
    clock.advance(400);
    checker.update("luna.gata");
    expect(calls[0].signal.aborted).toBe(true);
    calls[0].resolve({ handle: "luna", available: false, reason: "taken" });
    clock.advance(400);
    calls[1].resolve({ handle: "luna.gata", available: true, reason: null });
    await flush();
    expect(statuses.map((status) => status.kind)).toEqual(["checking", "checking", "available"]);
  });

  test("traduce ocupado y reservado desde la API", async () => {
    const { clock, calls, statuses, checker } = setup();
    checker.update("admin");
    clock.advance(400);
    calls[0].resolve({ handle: "admin", available: false, reason: "reserved" });
    await flush();
    checker.update("toby");
    clock.advance(400);
    calls[1].resolve({ handle: "toby", available: false, reason: "taken" });
    await flush();
    expect(statuses.filter((status) => status.kind !== "checking")).toEqual([
      { kind: "reserved", handle: "admin" },
      { kind: "taken", handle: "toby" },
    ]);
  });

  test("un formato no válido o vacío se resuelve sin llamar a la API", () => {
    const { clock, calls, statuses, checker } = setup();
    checker.update("ab");
    checker.update("");
    clock.advance(1_000);
    expect(calls).toHaveLength(0);
    expect(statuses).toEqual([{ kind: "invalid", handle: "ab" }, { kind: "idle" }]);
  });

  test("si no se puede comprobar queda en 'unknown' (decide el envío)", async () => {
    const clock = fakeScheduler();
    const statuses: HandleStatus[] = [];
    const checker = createHandleChecker({
      schedule: clock.schedule,
      onStatus: (status) => statuses.push(status),
      check: async () => {
        throw new ApiError({ status: 0, code: "network-error" });
      },
    });
    checker.update("luna");
    clock.advance(400);
    await flush();
    expect(statuses.at(-1)).toEqual({ kind: "unknown", handle: "luna" });
  });

  test("dispose cancela la espera y la solicitud", () => {
    const { clock, calls, checker } = setup();
    checker.update("luna");
    checker.dispose();
    clock.advance(1_000);
    expect(calls).toHaveLength(0);
  });

  test("los estados bloqueantes se convierten en error del campo", () => {
    expect(handleStatusError({ kind: "taken", handle: "x" })).toBe("handleTaken");
    expect(handleStatusError({ kind: "reserved", handle: "x" })).toBe("handleReserved");
    expect(handleStatusError({ kind: "invalid", handle: "x" })).toBe("handleInvalid");
    expect(handleStatusError({ kind: "checking", handle: "x" })).toBeNull();
    expect(handleStatusError({ kind: "unknown", handle: "x" })).toBeNull();
  });
});

describe("Idempotency-Key", () => {
  const request = buildCreatePetRequest({
    name: "Luna",
    handle: "luna.gata",
    species: "cat",
    sex: "female",
    breed: "",
    birthMonth: "",
  });
  if (!request.ok) throw new Error("solicitud de prueba no válida");

  test("es la misma en los reenvíos del mismo intento (doble clic, reintento)", () => {
    let counter = 0;
    const keys = createIdempotencyKeys(() => `key-${++counter}`);
    expect(keys.keyFor(request.request)).toBe("key-1");
    expect(keys.keyFor({ ...request.request })).toBe("key-1");
  });

  test("cambia si cambian los datos (otro intento)", () => {
    let counter = 0;
    const keys = createIdempotencyKeys(() => `key-${++counter}`);
    keys.keyFor(request.request);
    expect(keys.keyFor({ ...request.request, handle: "luna.gata2" })).toBe("key-2");
    expect(keys.keyFor({ ...request.request, handle: "luna.gata2" })).toBe("key-2");
  });

  test("por defecto es un UUID", () => {
    expect(createIdempotencyKeys().keyFor(request.request)).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("validación y cuerpo de POST /v1/pets", () => {
  const base: PetFormValues = {
    name: "  Luna ",
    handle: "@Luna.Gata",
    species: "cat",
    sex: "female",
    breed: "Siamés",
    birthMonth: "2023-05",
  };

  test("arma el cuerpo normalizado", () => {
    expect(buildCreatePetRequest(base)).toEqual({
      ok: true,
      request: {
        name: "Luna",
        handle: "luna.gata",
        species: "cat",
        sex: "female",
        breed: "Siamés",
        birthMonth: "2023-05",
      },
    });
  });

  test("raza y nacimiento vacíos van como null", () => {
    const result = buildCreatePetRequest({ ...base, breed: " ", birthMonth: "" });
    expect(result.ok && result.request).toMatchObject({ breed: null, birthMonth: null });
  });

  test("señala cada campo no válido", () => {
    const result = buildCreatePetRequest({
      ...base,
      name: "",
      handle: "a b",
      breed: "x".repeat(61),
      birthMonth: "2023-13",
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        alert: null,
        fields: {
          name: "nameRequired",
          handle: "handleInvalid",
          breed: "breedTooLong",
          birthMonth: "birthMonthInvalid",
        },
      },
    });
  });
});

describe("errores de la API", () => {
  const problem = (status: number, code: ApiError["code"], fieldErrors = {}) =>
    new ApiError({ status, code, fieldErrors });

  test("409 con el handle: ocupado, en el campo handle", () => {
    expect(mapCreatePetError(problem(409, "conflict", { handle: "Ya está en uso" }))).toEqual({
      fields: { handle: "handleTaken" },
      alert: null,
    });
  });

  test("409 sin campo: límite de mascotas, como aviso general", () => {
    expect(mapCreatePetError(problem(409, "conflict"))).toEqual({ fields: {}, alert: "petLimit" });
  });

  test("422 en el handle (reservado o formato): en el campo handle", () => {
    expect(
      mapCreatePetError(problem(422, "validation-failed", { handle: "Está reservado" })),
    ).toEqual({ fields: { handle: "handleRejected" }, alert: null });
  });

  test("422 en otros campos: cada uno junto a su campo; rutas desconocidas, aviso", () => {
    expect(
      mapCreatePetError(problem(422, "validation-failed", { name: "x", birthMonth: "y" })),
    ).toEqual({ fields: { name: "fieldInvalid", birthMonth: "fieldInvalid" }, alert: null });
    expect(mapCreatePetError(problem(422, "validation-failed", { bio: "x" }))).toEqual({
      fields: {},
      alert: "validation",
    });
  });

  test("red, 429 y errores desconocidos van al aviso general", () => {
    expect(mapCreatePetError(problem(0, "network-error")).alert).toBe("network");
    expect(mapCreatePetError(problem(429, "rate-limited")).alert).toBe("rateLimited");
    expect(mapCreatePetError(problem(500, "internal-error")).alert).toBe("generic");
    expect(mapCreatePetError(new Error("boom")).alert).toBe("generic");
  });
});
