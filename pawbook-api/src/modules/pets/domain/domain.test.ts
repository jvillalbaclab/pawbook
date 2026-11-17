import { describe, expect, test } from "bun:test";
import type { Uuid } from "../../../shared/ids";
import { isValidFirstName, normalizeFirstName, publicCaretakerName } from "./caretaker";
import {
  canChangeHandle,
  checkHandle,
  HANDLE_CHANGE_COOLDOWN_MS,
  nextHandleChangeAt,
  normalizeHandle,
} from "./handle";
import { checkPetProfile, normalizeProfile, type PetProfile } from "./pet";

const profile = (overrides: Partial<PetProfile> = {}): PetProfile => ({
  name: "Luna",
  species: "cat",
  sex: "female",
  breed: null,
  birthMonth: null,
  bio: null,
  favoriteToy: null,
  favoriteTreat: null,
  avatarMediaId: null,
  coverMediaId: null,
  ...overrides,
});

const NOW = new Date("2026-11-17T10:00:00Z");

describe("handle", () => {
  test("normaliza mayúsculas, espacios y la @ inicial", () => {
    expect(normalizeHandle("  @Luna.Gato ")).toBe("luna.gato");
    expect(normalizeHandle("ROCCO_1")).toBe("rocco_1");
  });

  test("acepta 3-30 caracteres de [a-z0-9_.]", () => {
    expect(checkHandle("abc")).toBeNull();
    expect(checkHandle("luna.gato_2024")).toBeNull();
    expect(checkHandle("a".repeat(30))).toBeNull();
  });

  test("rechaza longitudes fuera de rango, otros caracteres y handles sin letras ni números", () => {
    expect(checkHandle("ab")).toBe("invalid");
    expect(checkHandle("a".repeat(31))).toBe("invalid");
    expect(checkHandle("luna-gato")).toBe("invalid");
    expect(checkHandle("luña")).toBe("invalid");
    expect(checkHandle("Luna")).toBe("invalid"); // sin normalizar
    expect(checkHandle("...")).toBe("invalid");
    expect(checkHandle("___")).toBe("invalid");
  });

  test("rechaza handles reservados y los que empiezan por pawbook", () => {
    expect(checkHandle("admin")).toBe("reserved");
    expect(checkHandle("ajustes")).toBe("reserved");
    expect(checkHandle("pawbook")).toBe("reserved");
    expect(checkHandle("pawbook.oficial")).toBe("reserved");
    expect(checkHandle("mi.pawbook")).toBeNull();
  });

  test("el primer cambio está permitido; luego uno cada 30 días", () => {
    expect(canChangeHandle(null, NOW)).toBe(true);
    expect(nextHandleChangeAt(null)).toBeNull();

    const changedAt = new Date(NOW.getTime() - HANDLE_CHANGE_COOLDOWN_MS + 1);
    expect(canChangeHandle(changedAt, NOW)).toBe(false);
    expect(nextHandleChangeAt(changedAt)?.getTime()).toBe(NOW.getTime() + 1);

    const longAgo = new Date(NOW.getTime() - HANDLE_CHANGE_COOLDOWN_MS);
    expect(canChangeHandle(longAgo, NOW)).toBe(true);
  });
});

describe("perfil", () => {
  test("un perfil mínimo es válido", () => {
    expect(checkPetProfile(profile(), NOW)).toEqual([]);
  });

  test("nombre de 1 a 40 caracteres y bio de hasta 300", () => {
    expect(checkPetProfile(profile({ name: " " }), NOW).map((p) => p.field)).toEqual(["name"]);
    expect(checkPetProfile(profile({ name: "x".repeat(41) }), NOW)).toHaveLength(1);
    expect(checkPetProfile(profile({ bio: "x".repeat(300) }), NOW)).toEqual([]);
    expect(checkPetProfile(profile({ bio: "x".repeat(301) }), NOW).map((p) => p.field)).toEqual([
      "bio",
    ]);
  });

  test("la fecha de nacimiento aproximada no puede ser futura ni absurda", () => {
    expect(checkPetProfile(profile({ birthMonth: "2026-11" }), NOW)).toEqual([]);
    expect(checkPetProfile(profile({ birthMonth: "2026-12" }), NOW)).toHaveLength(1);
    expect(checkPetProfile(profile({ birthMonth: "1970-01" }), NOW)).toHaveLength(1);
    expect(checkPetProfile(profile({ birthMonth: "2020-13" }), NOW)).toHaveLength(1);
  });

  test("normaliza textos: recorta y vacía los opcionales en blanco", () => {
    const normalized = normalizeProfile(profile({ name: "  Luna ", bio: "   ", breed: " Persa " }));
    expect(normalized).toMatchObject({ name: "Luna", bio: null, breed: "Persa" });
  });
});

describe("responsable (FR-PET-008)", () => {
  test("se muestra el nombre de pila salvo que lo oculte", () => {
    const caretaker = { userId: "u" as Uuid, firstName: "Laura", showFirstName: true };
    expect(publicCaretakerName(caretaker)).toBe("Laura");
    expect(publicCaretakerName({ ...caretaker, showFirstName: false })).toBeNull();
    expect(publicCaretakerName({ ...caretaker, firstName: null })).toBeNull();
    expect(publicCaretakerName(null)).toBeNull();
  });

  test("valida el nombre de pila", () => {
    expect(normalizeFirstName("  María   José ")).toBe("María José");
    expect(normalizeFirstName("   ")).toBeNull();
    expect(isValidFirstName("María José")).toBe(true);
    expect(isValidFirstName("O'Neill")).toBe(true);
    expect(isValidFirstName("laura@example.com")).toBe(false);
    expect(isValidFirstName("600123456")).toBe(false);
    expect(isValidFirstName("x".repeat(41))).toBe(false);
  });
});
