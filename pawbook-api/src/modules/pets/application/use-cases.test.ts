import { describe, expect, test } from "bun:test";
import { type Uuid, uuidv7 } from "../../../shared/ids";
import { HANDLE_CHANGE_COOLDOWN_MS } from "../domain/handle";
import { MAX_ACTIVE_PETS_PER_USER, type Pet } from "../domain/pet";
import { getCaretaker, updateCaretaker } from "./caretaker";
import {
  archivePet,
  type CreatePetInput,
  checkHandleAvailability,
  createPet,
  getPetSocialProfile,
  getPublicProfile,
  listMyPets,
  updatePet,
  verifyActivePet,
} from "./pets";
import { createTestPetsDeps, type TestPetsDeps } from "./testing/in-memory";

const ANA = uuidv7();
const BRUNO = uuidv7();

const input = (handle: string, overrides: Partial<CreatePetInput> = {}): CreatePetInput => ({
  handle,
  name: "Luna",
  species: "cat",
  sex: "female",
  ...overrides,
});

async function created(deps: TestPetsDeps, owner: Uuid, handle: string): Promise<Pet> {
  const result = await createPet(deps, owner, input(handle));
  if (!result.ok) throw new Error(`no se creó ${handle}: ${result.error.code}`);
  return result.value;
}

describe("crear mascota", () => {
  test("normaliza el handle, guarda el perfil y emite pets.pet-created sin PII", async () => {
    const deps = createTestPetsDeps();
    const result = await createPet(
      deps,
      ANA,
      input("@Luna.Gato", { bio: "  Reina del sofá  ", breed: "", birthMonth: "2023-05" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      handle: "luna.gato",
      ownerId: ANA,
      bio: "Reina del sofá",
      breed: null,
      birthMonth: "2023-05",
      handleChangedAt: null,
      archivedAt: null,
    });
    expect(deps.store.state.lockedOwners).toEqual([ANA]);
    expect(deps.store.state.events).toEqual([
      {
        type: "pets.pet-created",
        occurredAt: deps.clock.now(),
        payload: { petId: result.value.id, ownerId: ANA },
      },
    ]);
  });

  test("handle inválido, reservado u ocupado (sin distinguir mayúsculas)", async () => {
    const deps = createTestPetsDeps();
    await created(deps, ANA, "luna.gato");
    const codes = await Promise.all(
      ["lu", "admin", "LUNA.GATO"].map(async (handle) => {
        const result = await createPet(deps, BRUNO, input(handle));
        return result.ok ? "ok" : result.error.code;
      }),
    );
    expect(codes).toEqual(["handle-invalid", "handle-reserved", "handle-taken"]);
    expect(deps.store.state.pets.size).toBe(1);
  });

  test("perfil inválido: devuelve los campos con problemas", async () => {
    const deps = createTestPetsDeps();
    const result = await createPet(deps, ANA, input("luna", { birthMonth: "2030-01" }));
    expect(result.ok).toBe(false);
    if (result.ok || result.error.code !== "invalid-profile") throw new Error("esperaba error");
    expect(result.error.problems.map((problem) => problem.field)).toEqual(["birthMonth"]);
  });

  test("máximo 10 mascotas activas; las archivadas no cuentan", async () => {
    const deps = createTestPetsDeps();
    const pets: Pet[] = [];
    for (let i = 0; i < MAX_ACTIVE_PETS_PER_USER; i++)
      pets.push(await created(deps, ANA, `pet${i}`));

    const eleventh = await createPet(deps, ANA, input("pet10"));
    expect(eleventh).toEqual({ ok: false, error: { code: "pet-limit-reached", limit: 10 } });
    // Otro usuario no se ve afectado.
    expect((await createPet(deps, BRUNO, input("bruno.pet"))).ok).toBe(true);

    const first = pets[0];
    if (first === undefined) throw new Error("sin mascotas");
    await archivePet(deps, ANA, first.id);
    expect((await createPet(deps, ANA, input("pet10"))).ok).toBe(true);
  });
});

describe("editar mascota", () => {
  test("cambia solo los campos presentes; null vacía un opcional", async () => {
    const deps = createTestPetsDeps();
    const pet = await created(deps, ANA, "luna");
    await updatePet(deps, ANA, pet.id, { bio: "Hola" });
    deps.clock.advance(1000);
    const result = await updatePet(deps, ANA, pet.id, { name: "Luna II", bio: null });
    expect(result.ok && result.value).toMatchObject({ name: "Luna II", bio: null, sex: "female" });
    const lastEvent = deps.store.state.events.at(-1);
    expect(lastEvent?.type).toBe("pets.pet-updated");
    expect(lastEvent?.payload).toEqual({ petId: pet.id, ownerId: ANA, fields: ["name", "bio"] });
  });

  test("sin cambios reales no escribe ni emite eventos", async () => {
    const deps = createTestPetsDeps();
    const pet = await created(deps, ANA, "luna");
    const result = await updatePet(deps, ANA, pet.id, { name: " Luna ", handle: "@LUNA" });
    expect(result.ok && result.value).toEqual(pet);
    expect(deps.store.state.events).toHaveLength(1);
  });

  test("solo el responsable: para otro usuario o si está archivada, no existe", async () => {
    const deps = createTestPetsDeps();
    const pet = await created(deps, ANA, "luna");
    expect(await updatePet(deps, BRUNO, pet.id, { name: "Mía" })).toEqual({
      ok: false,
      error: { code: "not-found" },
    });
    await archivePet(deps, ANA, pet.id);
    expect(await updatePet(deps, ANA, pet.id, { name: "Mía" })).toEqual({
      ok: false,
      error: { code: "not-found" },
    });
  });

  test("el handle se cambia como máximo una vez cada 30 días", async () => {
    const deps = createTestPetsDeps();
    const pet = await created(deps, ANA, "luna");

    const first = await updatePet(deps, ANA, pet.id, { handle: "luna.gata" });
    expect(first.ok && first.value.handle).toBe("luna.gata");
    expect(first.ok && first.value.handleChangedAt).toEqual(deps.clock.now());

    deps.clock.advance(HANDLE_CHANGE_COOLDOWN_MS - 1);
    const second = await updatePet(deps, ANA, pet.id, { handle: "luna.reina" });
    expect(second.ok).toBe(false);
    if (second.ok || second.error.code !== "handle-change-too-soon") throw new Error("esperaba");
    expect(second.error.nextChangeAt.getTime()).toBe(deps.clock.now().getTime() + 1);

    deps.clock.advance(1);
    const third = await updatePet(deps, ANA, pet.id, { handle: "luna.reina" });
    expect(third.ok && third.value.handle).toBe("luna.reina");
    expect(deps.store.state.events.at(-1)?.payload).toMatchObject({ fields: ["handle"] });
  });

  test("un handle ocupado al editar devuelve handle-taken y no consume el cambio", async () => {
    const deps = createTestPetsDeps();
    await created(deps, BRUNO, "rocco");
    const pet = await created(deps, ANA, "luna");
    expect(await updatePet(deps, ANA, pet.id, { handle: "Rocco" })).toEqual({
      ok: false,
      error: { code: "handle-taken" },
    });
    expect((await updatePet(deps, ANA, pet.id, { handle: "luna2" })).ok).toBe(true);
  });
});

describe("archivar", () => {
  test("es idempotente, emite un solo evento e invalida la caché de propiedad", async () => {
    const deps = createTestPetsDeps();
    const pet = await created(deps, ANA, "luna");
    expect(await verifyActivePet(deps, ANA, pet.id)).toBe(true);
    expect(deps.cache.entries.get(pet.id)).toBe(ANA);

    expect(await archivePet(deps, ANA, pet.id)).toEqual({ ok: true, value: undefined });
    expect(await archivePet(deps, ANA, pet.id)).toEqual({ ok: true, value: undefined });
    expect(deps.cache.entries.has(pet.id)).toBe(false);
    expect(deps.store.state.events.map((event) => event.type)).toEqual([
      "pets.pet-created",
      "pets.pet-archived",
    ]);
    expect(await verifyActivePet(deps, ANA, pet.id)).toBe(false);
    expect(await listMyPets(deps, ANA)).toEqual([]);
  });

  test("no se puede archivar la mascota de otro", async () => {
    const deps = createTestPetsDeps();
    const pet = await created(deps, ANA, "luna");
    expect(await archivePet(deps, BRUNO, pet.id)).toEqual({
      ok: false,
      error: { code: "not-found" },
    });
  });

  test("si Valkey falla al invalidar, el archivado se confirma igual y se informa", async () => {
    const deps = createTestPetsDeps();
    const pet = await created(deps, ANA, "luna");
    deps.cache.failing = true;
    expect((await archivePet(deps, ANA, pet.id)).ok).toBe(true);
    expect(deps.errors).toHaveLength(1);
  });
});

describe("mascota activa (FR-PET-005)", () => {
  test("la segunda comprobación sale de la caché", async () => {
    const deps = createTestPetsDeps();
    const pet = await created(deps, ANA, "luna");
    expect(await verifyActivePet(deps, ANA, pet.id)).toBe(true);
    expect(await verifyActivePet(deps, BRUNO, pet.id)).toBe(false);
    expect(deps.cache.hits).toBe(1);
  });

  test("una mascota inexistente no se cachea", async () => {
    const deps = createTestPetsDeps();
    expect(await verifyActivePet(deps, ANA, uuidv7())).toBe(false);
    expect(deps.cache.entries.size).toBe(0);
  });

  test("con Valkey caído consulta la base de datos", async () => {
    const deps = createTestPetsDeps();
    const pet = await created(deps, ANA, "luna");
    deps.cache.failing = true;
    expect(await verifyActivePet(deps, ANA, pet.id)).toBe(true);
    expect(await verifyActivePet(deps, BRUNO, pet.id)).toBe(false);
    expect(deps.errors.length).toBeGreaterThan(0);
  });
});

describe("perfil público y responsable (FR-PET-008)", () => {
  test("muestra el nombre de pila por defecto y lo oculta si el usuario lo pide", async () => {
    const deps = createTestPetsDeps();
    await created(deps, ANA, "luna");
    expect((await getPublicProfile(deps, "LUNA"))?.caretakerFirstName).toBeNull();

    expect((await updateCaretaker(deps, ANA, { firstName: " Laura " })).ok).toBe(true);
    expect((await getPublicProfile(deps, "@luna"))?.caretakerFirstName).toBe("Laura");

    await updateCaretaker(deps, ANA, { showFirstName: false });
    expect((await getPublicProfile(deps, "luna"))?.caretakerFirstName).toBeNull();
    expect(await getCaretaker(deps, ANA)).toEqual({
      userId: ANA,
      firstName: "Laura",
      showFirstName: false,
    });
  });

  test("rechaza un nombre que no parece un nombre de pila", async () => {
    const deps = createTestPetsDeps();
    expect(await updateCaretaker(deps, ANA, { firstName: "laura@example.com" })).toEqual({
      ok: false,
      error: "invalid-first-name",
    });
  });

  test("una mascota archivada o un handle inválido no tienen perfil público", async () => {
    const deps = createTestPetsDeps();
    const pet = await created(deps, ANA, "luna");
    await archivePet(deps, ANA, pet.id);
    expect(await getPublicProfile(deps, "luna")).toBeNull();
    expect(await getPublicProfile(deps, "no válido")).toBeNull();
  });
});

describe("disponibilidad del handle y lectura para social", () => {
  test("informa del motivo", async () => {
    const deps = createTestPetsDeps();
    await created(deps, ANA, "luna");
    expect(await checkHandleAvailability(deps, "@Luna")).toEqual({
      handle: "luna",
      available: false,
      reason: "taken",
    });
    expect((await checkHandleAvailability(deps, "x")).reason).toBe("invalid");
    expect((await checkHandleAvailability(deps, "soporte")).reason).toBe("reserved");
    expect(await checkHandleAvailability(deps, "rocco")).toEqual({
      handle: "rocco",
      available: true,
      reason: null,
    });
  });

  test("el perfil para Stream refleja si está archivada", async () => {
    const deps = createTestPetsDeps();
    const pet = await created(deps, ANA, "luna");
    expect(await getPetSocialProfile(deps, pet.id)).toEqual({
      petId: pet.id,
      handle: "luna",
      name: "Luna",
      avatarMediaId: null,
      archived: false,
    });
    await archivePet(deps, ANA, pet.id);
    expect((await getPetSocialProfile(deps, pet.id))?.archived).toBe(true);
    expect(await getPetSocialProfile(deps, uuidv7())).toBeNull();
  });
});
