import { describe, expect, test } from "bun:test";
import { domainEvent } from "../../../shared/events";
import { uuidv7 } from "../../../shared/ids";
import type { PetSocialProfile } from "../../pets/index";
import { petIdentityHandlers } from "./pet-identity-sync";
import { issueStreamTokens } from "./stream-tokens";
import { createTestSocialDeps } from "./testing/in-memory";

const USER = uuidv7();
const PET = uuidv7();
const LUNA: PetSocialProfile = {
  petId: PET,
  handle: "luna",
  name: "Luna",
  avatarMediaId: null,
  archived: false,
};

describe("POST /v1/stream/token (FR-AUTH-010)", () => {
  test("Feeds para pet_<id> y Chat para usr_<id>, con caducidad de 1 h", () => {
    const deps = createTestSocialDeps();
    const result = issueStreamTokens(deps, { userId: USER, petId: PET, emailVerified: true });
    expect(result).toEqual({
      ok: true,
      value: {
        apiKey: "test-api-key",
        feedsUserId: `pet_${PET}`,
        feedsToken: `token(pet_${PET},2026-11-17T10:00:00.000Z,2026-11-17T11:00:00.000Z)`,
        chatUserId: `usr_${USER}`,
        chatToken: `token(usr_${USER},2026-11-17T10:00:00.000Z,2026-11-17T11:00:00.000Z)`,
        expiresAt: new Date("2026-11-17T11:00:00Z"),
      },
    });
  });

  test("sin correo verificado no hay token de Chat (FR-AUTH-006)", () => {
    const deps = createTestSocialDeps();
    const result = issueStreamTokens(deps, { userId: USER, petId: PET, emailVerified: false });
    expect(result.ok && result.value.chatToken).toBeNull();
    expect(result.ok && result.value.feedsToken).toContain(`pet_${PET}`);
  });

  test("sin Stream configurado: realtime-disabled", () => {
    const deps = createTestSocialDeps({ tokens: null });
    expect(issueStreamTokens(deps, { userId: USER, petId: PET, emailVerified: true })).toEqual({
      ok: false,
      error: "realtime-disabled",
    });
  });
});

describe("sincronización de la mascota con Stream (T-M0.35)", () => {
  const deliver = (type: string) => ({
    ...domainEvent(type, { petId: PET, ownerId: USER, fields: [] }),
    id: uuidv7(),
  });

  function handlerFor(deps: ReturnType<typeof createTestSocialDeps>, type: string) {
    const handler = petIdentityHandlers(deps).find((candidate) => candidate.eventType === type);
    if (handler === undefined) throw new Error(`sin handler para ${type}`);
    return handler;
  }

  test("hay un handler por evento de mascota, todos con el mismo consumidor", () => {
    const handlers = petIdentityHandlers(createTestSocialDeps());
    expect(handlers.map((handler) => handler.eventType)).toEqual([
      "pets.pet-created",
      "pets.pet-updated",
      "pets.pet-archived",
    ]);
    expect(new Set(handlers.map((handler) => handler.name))).toEqual(
      new Set(["social.sync-pet-identity"]),
    );
  });

  test("crear o editar hace upsert del usuario pet_<id> con el estado actual", async () => {
    const deps = createTestSocialDeps();
    deps.profiles.set(PET, LUNA);
    await handlerFor(deps, "pets.pet-created").handle(deliver("pets.pet-created"));
    deps.profiles.set(PET, { ...LUNA, name: "Luna II" });
    await handlerFor(deps, "pets.pet-updated").handle(deliver("pets.pet-updated"));
    expect(deps.identities.calls).toEqual([
      ["upsert", { streamUserId: `pet_${PET}`, handle: "luna", name: "Luna", avatarMediaId: null }],
      [
        "upsert",
        { streamUserId: `pet_${PET}`, handle: "luna", name: "Luna II", avatarMediaId: null },
      ],
    ]);
  });

  test("un evento atrasado de una mascota ya archivada la desactiva en vez de reactivarla", async () => {
    const deps = createTestSocialDeps();
    deps.profiles.set(PET, { ...LUNA, archived: true });
    await handlerFor(deps, "pets.pet-updated").handle(deliver("pets.pet-updated"));
    await handlerFor(deps, "pets.pet-archived").handle(deliver("pets.pet-archived"));
    expect(deps.identities.calls).toEqual([
      ["deactivate", `pet_${PET}`],
      ["deactivate", `pet_${PET}`],
    ]);
  });

  test("si Stream falla, el handler lanza para que pg-boss reintente", async () => {
    const deps = createTestSocialDeps();
    deps.profiles.set(PET, LUNA);
    deps.identities.failNext = true;
    const handler = handlerFor(deps, "pets.pet-created");
    await expect(handler.handle(deliver("pets.pet-created"))).rejects.toThrow("Stream");
    await handler.handle(deliver("pets.pet-created"));
    expect(deps.identities.calls).toHaveLength(1);
  });

  test("una mascota que ya no existe no se sincroniza", async () => {
    const deps = createTestSocialDeps();
    await handlerFor(deps, "pets.pet-created").handle(deliver("pets.pet-created"));
    expect(deps.identities.calls).toEqual([]);
  });
});
