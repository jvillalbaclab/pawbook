import type { Clock } from "../../../shared/clock";
import { type DomainEvent, domainEvent } from "../../../shared/events";
import type { Uuid } from "../../../shared/ids";
import type { PetProfile } from "./pet";

/*
 * Eventos de pets. El payload solo lleva IDs y nombres de campos, ningún dato personal ni del
 * perfil: quien necesite el estado actual (p. ej. la sincronización con Stream) lo lee por la
 * API del módulo. Así un evento atrasado o reintentado nunca reescribe datos viejos.
 */

export type PetField = keyof PetProfile | "handle";

export type PetCreated = DomainEvent<"pets.pet-created", { petId: string; ownerId: string }>;

export type PetUpdated = DomainEvent<
  "pets.pet-updated",
  { petId: string; ownerId: string; fields: PetField[] }
>;

export type PetArchived = DomainEvent<"pets.pet-archived", { petId: string; ownerId: string }>;

export type PetEvent = PetCreated | PetUpdated | PetArchived;

export const petCreated = (petId: Uuid, ownerId: Uuid, clock: Clock): PetCreated =>
  domainEvent("pets.pet-created", { petId, ownerId }, clock);

export const petUpdated = (
  petId: Uuid,
  ownerId: Uuid,
  fields: PetField[],
  clock: Clock,
): PetUpdated => domainEvent("pets.pet-updated", { petId, ownerId, fields }, clock);

export const petArchived = (petId: Uuid, ownerId: Uuid, clock: Clock): PetArchived =>
  domainEvent("pets.pet-archived", { petId, ownerId }, clock);
