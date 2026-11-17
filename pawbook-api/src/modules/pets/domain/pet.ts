import type { Uuid } from "../../../shared/ids";

/*
 * Mascota (FR-PET-001). Es la protagonista de la red: publica, reacciona y es seguida. Hoy tiene
 * un único Usuario responsable (`ownerId`); la co-gestión (FR-PET-007, PRD Q5) está pendiente de
 * decisión (T-F0.03). Toda comprobación de "¿puede este usuario gestionar esta mascota?" pasa por
 * `isManagedBy`, de modo que añadir co-propietarios cambie esa función y su persistencia, no los
 * casos de uso ni el middleware `activePet`.
 */

export const MAX_ACTIVE_PETS_PER_USER = 10;
export const PET_NAME_MAX_LENGTH = 40;
export const PET_BIO_MAX_LENGTH = 300;
export const PET_SHORT_TEXT_MAX_LENGTH = 60;

export type Species = "dog" | "cat";
export type Sex = "female" | "male";

/** Datos de perfil que el responsable puede editar. Los textos opcionales vacíos son `null`. */
export type PetProfile = {
  readonly name: string;
  readonly species: Species;
  readonly sex: Sex;
  /** Texto libre; el catálogo de razas lo ofrece el cliente (FR-PET-001). */
  readonly breed: string | null;
  /** Fecha de nacimiento aproximada, con precisión de mes: `AAAA-MM`. */
  readonly birthMonth: string | null;
  readonly bio: string | null;
  readonly favoriteToy: string | null;
  readonly favoriteTreat: string | null;
  /** Medios del módulo `media` (M1). Hoy solo se guarda el ID; no se valida contra media. */
  readonly avatarMediaId: Uuid | null;
  readonly coverMediaId: Uuid | null;
};

export type Pet = PetProfile & {
  readonly id: Uuid;
  readonly ownerId: Uuid;
  /** Siempre normalizado con `normalizeHandle`. */
  readonly handle: string;
  /** Último cambio de handle; `null` si conserva el elegido al crearla. */
  readonly handleChangedAt: Date | null;
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type PetStatus = "active" | "archived";

export function petStatus(pet: Pick<Pet, "archivedAt">): PetStatus {
  return pet.archivedAt === null ? "active" : "archived";
}

/** Único punto que decide quién gestiona una mascota (ver comentario de cabecera). */
export function isManagedBy(pet: Pick<Pet, "ownerId">, userId: string): boolean {
  return pet.ownerId === userId;
}

const BIRTH_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
/** Ningún perro o gato documentado supera los 40 años: más atrás es una errata. */
const MAX_AGE_YEARS = 40;

export type ProfileFieldProblem = { readonly field: keyof PetProfile; readonly message: string };

/** Invariantes del perfil que no dependen del formato del contrato HTTP. */
export function checkPetProfile(profile: PetProfile, now: Date): ProfileFieldProblem[] {
  const problems: ProfileFieldProblem[] = [];
  const name = profile.name.trim();
  if (name.length < 1 || name.length > PET_NAME_MAX_LENGTH) {
    problems.push({ field: "name", message: `Entre 1 y ${PET_NAME_MAX_LENGTH} caracteres` });
  }
  if (profile.bio !== null && profile.bio.length > PET_BIO_MAX_LENGTH) {
    problems.push({ field: "bio", message: `Como máximo ${PET_BIO_MAX_LENGTH} caracteres` });
  }
  for (const field of ["breed", "favoriteToy", "favoriteTreat"] as const) {
    const value = profile[field];
    if (value !== null && value.length > PET_SHORT_TEXT_MAX_LENGTH) {
      problems.push({ field, message: `Como máximo ${PET_SHORT_TEXT_MAX_LENGTH} caracteres` });
    }
  }
  if (profile.birthMonth !== null) {
    const match = BIRTH_MONTH_PATTERN.exec(profile.birthMonth);
    const year = Number(match?.[1]);
    const month = Number(match?.[2]);
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;
    if (match === null) {
      problems.push({ field: "birthMonth", message: "Formato AAAA-MM" });
    } else if (year > currentYear || (year === currentYear && month > currentMonth)) {
      problems.push({ field: "birthMonth", message: "No puede estar en el futuro" });
    } else if (year < currentYear - MAX_AGE_YEARS) {
      problems.push({ field: "birthMonth", message: "La fecha es demasiado antigua" });
    }
  }
  return problems;
}

/** Recorta los textos y convierte los opcionales vacíos en `null`. */
export function normalizeProfile(profile: PetProfile): PetProfile {
  const optional = (value: string | null) => {
    const trimmed = value?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  };
  return {
    ...profile,
    name: profile.name.trim(),
    breed: optional(profile.breed),
    bio: optional(profile.bio),
    favoriteToy: optional(profile.favoriteToy),
    favoriteTreat: optional(profile.favoriteTreat),
  };
}
