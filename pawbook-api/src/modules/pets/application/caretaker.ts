import type { Uuid } from "../../../shared/ids";
import { err, ok, type Result } from "../../../shared/result";
import {
  type Caretaker,
  defaultCaretaker,
  isValidFirstName,
  normalizeFirstName,
} from "../domain/caretaker";
import type { PetsDeps } from "./ports";

/*
 * Ajustes del responsable visibles en los perfiles de sus mascotas (FR-PET-008, US-06): nombre
 * de pila y si se muestra. Sin fila guardada, se muestra (si hay nombre) por defecto.
 */

export async function getCaretaker(deps: PetsDeps, userId: Uuid): Promise<Caretaker> {
  const stored = await deps.unitOfWork.run((tx) => deps.caretakers.find(tx, userId));
  return stored ?? defaultCaretaker(userId);
}

export type UpdateCaretakerInput = {
  /** `null` borra el nombre; omitido, no se toca. */
  readonly firstName?: string | null | undefined;
  readonly showFirstName?: boolean | undefined;
};

export async function updateCaretaker(
  deps: PetsDeps,
  userId: Uuid,
  input: UpdateCaretakerInput,
): Promise<Result<Caretaker, "invalid-first-name">> {
  const firstName = input.firstName === undefined ? undefined : normalizeFirstName(input.firstName);
  if (firstName !== undefined && firstName !== null && !isValidFirstName(firstName)) {
    return err("invalid-first-name");
  }
  return deps.unitOfWork.run(async (tx) => {
    const current = (await deps.caretakers.find(tx, userId)) ?? defaultCaretaker(userId);
    const next: Caretaker = {
      userId,
      firstName: firstName === undefined ? current.firstName : firstName,
      showFirstName: input.showFirstName ?? current.showFirstName,
    };
    await deps.caretakers.save(tx, next, deps.clock.now());
    return ok(next);
  });
}
