import { type Uuid, uuidv7 } from "../../../shared/ids";
import { err, ok, type Result } from "../../../shared/result";
import { type Caretaker, publicCaretakerName } from "../domain/caretaker";
import { type PetField, petArchived, petCreated, petUpdated } from "../domain/events";
import {
  canChangeHandle,
  checkHandle,
  type HandleProblem,
  nextHandleChangeAt,
  normalizeHandle,
} from "../domain/handle";
import {
  checkPetProfile,
  isManagedBy,
  MAX_ACTIVE_PETS_PER_USER,
  normalizeProfile,
  type Pet,
  type PetProfile,
  type ProfileFieldProblem,
} from "../domain/pet";
import type { PetsDeps } from "./ports";

/*
 * Casos de uso de mascotas: crear, editar y archivar (FR-PET-001, 004, 006), `@handle` único con
 * cambio limitado (FR-PET-002), perfil público con el responsable (FR-PET-008) y comprobación de
 * la mascota activa (FR-PET-005).
 */

export type PetError =
  | { readonly code: "handle-invalid" }
  | { readonly code: "handle-reserved" }
  | { readonly code: "handle-taken" }
  | { readonly code: "handle-change-too-soon"; readonly nextChangeAt: Date }
  | { readonly code: "pet-limit-reached"; readonly limit: number }
  | { readonly code: "invalid-profile"; readonly problems: ProfileFieldProblem[] }
  | { readonly code: "not-found" };

const handleError = (problem: HandleProblem): PetError =>
  problem === "invalid" ? { code: "handle-invalid" } : { code: "handle-reserved" };

/** Campos opcionales tal como llegan del contrato HTTP (Zod deja `undefined` si se omiten). */
type Optional<T> = { [K in keyof T]?: T[K] | undefined };

export type CreatePetInput = Optional<Omit<PetProfile, "name" | "species" | "sex">> & {
  readonly handle: string;
  readonly name: string;
  readonly species: PetProfile["species"];
  readonly sex: PetProfile["sex"];
};

export async function createPet(
  deps: PetsDeps,
  ownerId: Uuid,
  input: CreatePetInput,
): Promise<Result<Pet, PetError>> {
  const handle = normalizeHandle(input.handle);
  const handleProblem = checkHandle(handle);
  if (handleProblem !== null) return err(handleError(handleProblem));

  const now = deps.clock.now();
  const profile = normalizeProfile({
    name: input.name,
    species: input.species,
    sex: input.sex,
    breed: input.breed ?? null,
    birthMonth: input.birthMonth ?? null,
    bio: input.bio ?? null,
    favoriteToy: input.favoriteToy ?? null,
    favoriteTreat: input.favoriteTreat ?? null,
    avatarMediaId: input.avatarMediaId ?? null,
    coverMediaId: input.coverMediaId ?? null,
  });
  const problems = checkPetProfile(profile, now);
  if (problems.length > 0) return err({ code: "invalid-profile", problems });

  return deps.unitOfWork.run(async (tx): Promise<Result<Pet, PetError>> => {
    // Cerrojo por usuario: la cuenta y la inserción no pueden intercalarse con otro alta suya.
    await deps.pets.lockOwner(tx, ownerId, now);
    if ((await deps.pets.countActiveByOwner(tx, ownerId)) >= MAX_ACTIVE_PETS_PER_USER) {
      return err({ code: "pet-limit-reached", limit: MAX_ACTIVE_PETS_PER_USER });
    }
    const pet: Pet = {
      ...profile,
      id: uuidv7(deps.clock),
      ownerId,
      handle,
      handleChangedAt: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    if ((await deps.pets.insert(tx, pet)) === "handle-taken") return err({ code: "handle-taken" });
    await deps.outbox.enqueue(tx, [petCreated(pet.id, ownerId, deps.clock)]);
    return ok(pet);
  });
}

export type UpdatePetInput = Optional<PetProfile> & { readonly handle?: string | undefined };

const PROFILE_FIELDS = [
  "name",
  "species",
  "sex",
  "breed",
  "birthMonth",
  "bio",
  "favoriteToy",
  "favoriteTreat",
  "avatarMediaId",
  "coverMediaId",
] as const satisfies readonly (keyof PetProfile)[];

/**
 * Edita la mascota (FR-PET-004). Solo su responsable: para cualquier otro usuario la mascota
 * "no existe", igual que si estuviera archivada, para no revelar a quién pertenece cada ID.
 */
export async function updatePet(
  deps: PetsDeps,
  userId: Uuid,
  petId: Uuid,
  input: UpdatePetInput,
): Promise<Result<Pet, PetError>> {
  return deps.unitOfWork.run(async (tx): Promise<Result<Pet, PetError>> => {
    const current = await deps.pets.findByIdForUpdate(tx, petId);
    if (current === null || current.archivedAt !== null || !isManagedBy(current, userId)) {
      return err({ code: "not-found" });
    }
    const now = deps.clock.now();

    // `undefined` = no tocar el campo; `null` = vaciarlo.
    const keep = <T>(value: T | undefined, fallback: T): T =>
      value === undefined ? fallback : value;
    const profile = normalizeProfile({
      name: keep(input.name, current.name),
      species: keep(input.species, current.species),
      sex: keep(input.sex, current.sex),
      breed: keep(input.breed, current.breed),
      birthMonth: keep(input.birthMonth, current.birthMonth),
      bio: keep(input.bio, current.bio),
      favoriteToy: keep(input.favoriteToy, current.favoriteToy),
      favoriteTreat: keep(input.favoriteTreat, current.favoriteTreat),
      avatarMediaId: keep(input.avatarMediaId, current.avatarMediaId),
      coverMediaId: keep(input.coverMediaId, current.coverMediaId),
    });
    const changed: PetField[] = PROFILE_FIELDS.filter((field) => profile[field] !== current[field]);

    let handle = current.handle;
    let handleChangedAt = current.handleChangedAt;
    if (input.handle !== undefined) {
      const requested = normalizeHandle(input.handle);
      if (requested !== current.handle) {
        const handleProblem = checkHandle(requested);
        if (handleProblem !== null) return err(handleError(handleProblem));
        if (!canChangeHandle(current.handleChangedAt, now)) {
          const nextChangeAt = nextHandleChangeAt(current.handleChangedAt) ?? now;
          return err({ code: "handle-change-too-soon", nextChangeAt });
        }
        handle = requested;
        handleChangedAt = now;
        changed.push("handle");
      }
    }

    if (changed.length === 0) return ok(current);
    const problems = checkPetProfile(profile, now);
    if (problems.length > 0) return err({ code: "invalid-profile", problems });

    const updated: Pet = { ...current, ...profile, handle, handleChangedAt, updatedAt: now };
    if ((await deps.pets.update(tx, updated)) === "handle-taken") {
      return err({ code: "handle-taken" });
    }
    await deps.outbox.enqueue(tx, [petUpdated(petId, current.ownerId, changed, deps.clock)]);
    return ok(updated);
  });
}

/**
 * Archiva la mascota (FR-PET-006): deja de verse para terceros y de poder actuar como mascota
 * activa. Repetirlo no es un error. El handle sigue ocupado para que nadie suplante el perfil.
 */
export async function archivePet(
  deps: PetsDeps,
  userId: Uuid,
  petId: Uuid,
): Promise<Result<void, PetError>> {
  const outcome = await deps.unitOfWork.run(async (tx): Promise<Result<boolean, PetError>> => {
    const pet = await deps.pets.findByIdForUpdate(tx, petId);
    if (pet === null || !isManagedBy(pet, userId)) return err({ code: "not-found" });
    if (pet.archivedAt !== null) return ok(false);
    const now = deps.clock.now();
    await deps.pets.update(tx, { ...pet, archivedAt: now, updatedAt: now });
    await deps.outbox.enqueue(tx, [petArchived(pet.id, pet.ownerId, deps.clock)]);
    return ok(true);
  });
  if (!outcome.ok) return outcome;
  // Después de confirmar: si se invalidara antes, otra solicitud podría volver a cachear la
  // propiedad leyendo la fila todavía activa.
  if (outcome.value) await invalidateOwnership(deps, petId);
  return ok(undefined);
}

export async function listMyPets(deps: PetsDeps, userId: Uuid): Promise<Pet[]> {
  return deps.unitOfWork.run((tx) => deps.pets.listActiveByOwner(tx, userId));
}

export type PublicPetProfile = {
  readonly pet: Pet;
  /** Nombre de pila del responsable, o `null` si lo oculta o no lo ha indicado (FR-PET-008). */
  readonly caretakerFirstName: string | null;
};

/** Perfil público por handle (FR-PET-003, FR-FEED-010). Las archivadas no existen para terceros. */
export async function getPublicProfile(
  deps: PetsDeps,
  rawHandle: string,
): Promise<PublicPetProfile | null> {
  const handle = normalizeHandle(rawHandle);
  if (checkHandle(handle) === "invalid") return null;
  return deps.unitOfWork.run(async (tx) => {
    const pet = await deps.pets.findByHandle(tx, handle);
    if (pet === null || pet.archivedAt !== null) return null;
    const caretaker: Caretaker | null = await deps.caretakers.find(tx, pet.ownerId);
    return { pet, caretakerFirstName: publicCaretakerName(caretaker) };
  });
}

export type HandleAvailability = {
  readonly handle: string;
  readonly available: boolean;
  readonly reason: "invalid" | "reserved" | "taken" | null;
};

/** Para el onboarding (T-M0.41): dice si un handle se puede registrar ahora mismo. */
export async function checkHandleAvailability(
  deps: PetsDeps,
  rawHandle: string,
): Promise<HandleAvailability> {
  const handle = normalizeHandle(rawHandle);
  const problem = checkHandle(handle);
  if (problem !== null) return { handle, available: false, reason: problem };
  const taken = await deps.unitOfWork.run((tx) => deps.pets.handleExists(tx, handle));
  return { handle, available: !taken, reason: taken ? "taken" : null };
}

/**
 * ¿Puede `userId` actuar como `petId`? (FR-PET-005, middleware `activePet`). Solo mascotas
 * activas. Usa la caché de propiedad de 60 s; si Valkey falla, consulta la base de datos.
 */
export async function verifyActivePet(deps: PetsDeps, userId: Uuid, petId: Uuid): Promise<boolean> {
  let cachedOwner: Uuid | null = null;
  try {
    cachedOwner = await deps.ownershipCache.get(petId);
  } catch (error) {
    deps.reportError(error, { operation: "ownership-cache.get" });
  }
  if (cachedOwner !== null) return isManagedBy({ ownerId: cachedOwner }, userId);

  const pet = await deps.unitOfWork.run((tx) => deps.pets.findById(tx, petId));
  if (pet === null || pet.archivedAt !== null) return false;
  try {
    await deps.ownershipCache.set(petId, pet.ownerId);
  } catch (error) {
    deps.reportError(error, { operation: "ownership-cache.set" });
  }
  return isManagedBy(pet, userId);
}

async function invalidateOwnership(deps: PetsDeps, petId: Uuid): Promise<void> {
  try {
    await deps.ownershipCache.invalidate(petId);
  } catch (error) {
    // La entrada caduca sola en ≤ 60 s; se registra para vigilar Valkey.
    deps.reportError(error, { operation: "ownership-cache.invalidate", petId });
  }
}

/** Lo que otros módulos (social → Stream) necesitan de la mascota. Sin datos del responsable. */
export type PetSocialProfile = {
  readonly petId: Uuid;
  readonly handle: string;
  readonly name: string;
  readonly avatarMediaId: Uuid | null;
  readonly archived: boolean;
};

export async function getPetSocialProfile(
  deps: PetsDeps,
  petId: Uuid,
): Promise<PetSocialProfile | null> {
  const pet = await deps.unitOfWork.run((tx) => deps.pets.findById(tx, petId));
  if (pet === null) return null;
  return {
    petId: pet.id,
    handle: pet.handle,
    name: pet.name,
    avatarMediaId: pet.avatarMediaId,
    archived: pet.archivedAt !== null,
  };
}
