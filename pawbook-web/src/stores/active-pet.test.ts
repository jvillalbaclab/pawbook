import { describe, expect, test } from "bun:test";
import type { Pet } from "@pawbook/contracts";
import { type ActivePetPreference, createActivePetStore, toneFor } from "./active-pet";

/*
 * Mascota activa: inicialización desde GET /v1/me/pets, preferencia por usuario (solo el ID),
 * caída a la primera si la guardada ya no está y limpieza al cerrar sesión.
 */

const ANA = "0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e61";
const BEA = "0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e62";

function pet(id: string, name: string): Pet {
  const now = "2026-11-17T10:00:00.000Z";
  return {
    id,
    handle: name.toLowerCase(),
    name,
    species: "cat",
    sex: "female",
    breed: null,
    birthMonth: null,
    bio: null,
    favoriteToy: null,
    favoriteTreat: null,
    avatarMediaId: null,
    coverMediaId: null,
    createdAt: now,
    status: "active",
    updatedAt: now,
    handleChangedAt: null,
    nextHandleChangeAt: null,
  };
}

const LUNA = pet("11111111-1111-7111-8111-111111111111", "Luna");
const ROCCO = pet("22222222-2222-7222-8222-222222222222", "Rocco");
const KIRA = pet("33333333-3333-7333-8333-333333333333", "Kira");

function memoryPreference(initial: Record<string, string> = {}) {
  const saved = new Map(Object.entries(initial));
  const preference: ActivePetPreference = {
    read: (userId) => saved.get(userId) ?? null,
    write: (userId, petId) => {
      saved.set(userId, petId);
    },
  };
  return { preference, saved };
}

describe("inicialización desde la API", () => {
  test("sin preferencia guardada, la activa es la primera (la más antigua)", () => {
    const store = createActivePetStore(memoryPreference().preference);
    expect(store.getState().status).toBe("idle");
    store.getState().hydrate(ANA, [LUNA, ROCCO]);
    expect(store.getState()).toMatchObject({ status: "ready", userId: ANA, activePetId: LUNA.id });
  });

  test("recupera la mascota guardada para ese usuario", () => {
    const { preference } = memoryPreference({ [ANA]: ROCCO.id });
    const store = createActivePetStore(preference);
    store.getState().hydrate(ANA, [LUNA, ROCCO]);
    expect(store.getState().activePetId).toBe(ROCCO.id);
  });

  test("si la guardada ya no existe (archivada), cae a la primera y lo recuerda", () => {
    const { preference, saved } = memoryPreference({ [ANA]: KIRA.id });
    const store = createActivePetStore(preference);
    store.getState().hydrate(ANA, [LUNA, ROCCO]);
    expect(store.getState().activePetId).toBe(LUNA.id);
    expect(saved.get(ANA)).toBe(LUNA.id);
  });

  test("la preferencia es por usuario: la de otra cuenta no se aplica", () => {
    const { preference } = memoryPreference({ [BEA]: ROCCO.id });
    const store = createActivePetStore(preference);
    store.getState().hydrate(ANA, [LUNA, ROCCO]);
    expect(store.getState().activePetId).toBe(LUNA.id);
  });

  test("sin mascotas queda lista pero sin mascota activa", () => {
    const store = createActivePetStore(memoryPreference().preference);
    store.getState().hydrate(ANA, []);
    expect(store.getState()).toMatchObject({ status: "ready", activePetId: null });
  });

  test("al recargar la lista en la misma sesión se mantiene la elección en memoria", () => {
    const store = createActivePetStore(memoryPreference().preference);
    store.getState().hydrate(ANA, [LUNA, ROCCO]);
    store.getState().select(ROCCO.id);
    store.getState().hydrate(ANA, [LUNA, ROCCO, KIRA]);
    expect(store.getState().activePetId).toBe(ROCCO.id);
  });
});

describe("cambiar de mascota", () => {
  test("persiste solo el ID de la elegida, por usuario", () => {
    const { preference, saved } = memoryPreference();
    const store = createActivePetStore(preference);
    store.getState().hydrate(ANA, [LUNA, ROCCO]);
    store.getState().select(ROCCO.id);
    expect(store.getState().activePetId).toBe(ROCCO.id);
    expect(Object.fromEntries(saved)).toEqual({ [ANA]: ROCCO.id });
  });

  test("ignora una mascota que no es del usuario", () => {
    const store = createActivePetStore(memoryPreference().preference);
    store.getState().hydrate(ANA, [LUNA, ROCCO]);
    store.getState().select(KIRA.id);
    expect(store.getState().activePetId).toBe(LUNA.id);
  });

  test("una mascota recién creada pasa a ser la activa", () => {
    const { preference, saved } = memoryPreference();
    const store = createActivePetStore(preference);
    store.getState().hydrate(ANA, [LUNA]);
    store.getState().add(ANA, ROCCO);
    expect(store.getState().pets.map((mine) => mine.name)).toEqual(["Luna", "Rocco"]);
    expect(store.getState().activePetId).toBe(ROCCO.id);
    expect(saved.get(ANA)).toBe(ROCCO.id);
  });

  test("crear antes de que llegue la lista y recibirla después conserva la nueva", () => {
    const store = createActivePetStore(memoryPreference().preference);
    store.getState().add(ANA, ROCCO);
    store.getState().hydrate(ANA, [LUNA, ROCCO]);
    expect(store.getState().activePetId).toBe(ROCCO.id);
  });
});

describe("cerrar sesión", () => {
  test("vacía mascotas y elección, pero la preferencia sigue para la próxima vez", () => {
    const { preference, saved } = memoryPreference();
    const store = createActivePetStore(preference);
    store.getState().hydrate(ANA, [LUNA, ROCCO]);
    store.getState().select(ROCCO.id);
    store.getState().reset();
    expect(store.getState()).toMatchObject({
      status: "idle",
      userId: null,
      pets: [],
      activePetId: null,
    });
    store.getState().hydrate(ANA, [LUNA, ROCCO]);
    expect(store.getState().activePetId).toBe(ROCCO.id);
    expect(saved.size).toBe(1);
  });

  test("sin sesión no se puede elegir mascota", () => {
    const store = createActivePetStore(memoryPreference().preference);
    store.getState().select(LUNA.id);
    expect(store.getState().activePetId).toBeNull();
  });
});

test("el tono del avatar es estable por mascota", () => {
  expect(toneFor(LUNA.id)).toBe(toneFor(LUNA.id));
});
