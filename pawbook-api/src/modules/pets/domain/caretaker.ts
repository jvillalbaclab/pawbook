import type { Uuid } from "../../../shared/ids";

/*
 * Usuario responsable tal como aparece en el perfil público de sus mascotas (FR-PET-008, US-06):
 * "Responsable: Laura". Solo el nombre de pila, visible por defecto y ocultable en los ajustes;
 * nunca apellidos, correo ni contacto. El registro (identity) no pide el nombre, así que lo
 * guarda este módulo, que es quien lo muestra. La fila sirve además de cerrojo por usuario para
 * el límite de mascotas (ver `PetRepository.lockOwner`).
 */

export const CARETAKER_FIRST_NAME_MAX_LENGTH = 40;
/** Letras de cualquier idioma, espacios ("María José"), guion, apóstrofo y punto. */
const FIRST_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

export type Caretaker = {
  readonly userId: Uuid;
  readonly firstName: string | null;
  readonly showFirstName: boolean;
};

export function defaultCaretaker(userId: Uuid): Caretaker {
  return { userId, firstName: null, showFirstName: true };
}

/** Recorta y colapsa espacios. Devuelve `null` si queda vacío. */
export function normalizeFirstName(raw: string | null): string | null {
  const value = raw?.trim().replace(/\s+/g, " ") ?? "";
  return value === "" ? null : value;
}

export function isValidFirstName(firstName: string): boolean {
  return firstName.length <= CARETAKER_FIRST_NAME_MAX_LENGTH && FIRST_NAME_PATTERN.test(firstName);
}

/** Lo que el perfil público puede mostrar del responsable: nombre de pila o nada. */
export function publicCaretakerName(caretaker: Caretaker | null): string | null {
  if (caretaker === null || !caretaker.showFirstName) return null;
  return caretaker.firstName;
}
