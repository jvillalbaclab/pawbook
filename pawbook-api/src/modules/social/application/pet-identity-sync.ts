import type { DeliveredEvent, EventHandler } from "../../../shared/events";
import type { Uuid } from "../../../shared/ids";
import type { PetArchived, PetCreated, PetUpdated } from "../../pets/index";
import { feedsUserId } from "../domain/stream-identity";
import type { SocialDeps } from "./ports";

/*
 * Sincroniza cada mascota con su usuario de Stream `pet_<id>` (T-M0.35, ADR-002). Corre en el
 * worker como handler del outbox: si Stream falla, la mascota ya está creada y pg-boss reintenta
 * con backoff (NFR-REL-001). El evento solo trae el ID: se lee el estado actual, de modo que un
 * reintento tardío o dos eventos fuera de orden siempre dejan en Stream la versión vigente.
 */

async function syncPet(deps: SocialDeps, petId: Uuid): Promise<void> {
  const profile = await deps.petProfiles(petId);
  if (profile === null) return; // Ya no existe: nada que sincronizar.
  const streamUserId = feedsUserId(profile.petId);
  if (profile.archived) {
    await deps.identities.deactivatePet(streamUserId);
    return;
  }
  await deps.identities.upsertPet({
    streamUserId,
    handle: profile.handle,
    name: profile.name,
    avatarMediaId: profile.avatarMediaId,
  });
}

export function petIdentityHandlers(deps: SocialDeps): EventHandler[] {
  const onCreated: EventHandler<PetCreated> = {
    eventType: "pets.pet-created",
    name: "social.sync-pet-identity",
    handle: (event: DeliveredEvent<PetCreated>) => syncPet(deps, event.payload.petId as Uuid),
  };
  const onUpdated: EventHandler<PetUpdated> = {
    eventType: "pets.pet-updated",
    name: "social.sync-pet-identity",
    handle: (event: DeliveredEvent<PetUpdated>) => syncPet(deps, event.payload.petId as Uuid),
  };
  const onArchived: EventHandler<PetArchived> = {
    eventType: "pets.pet-archived",
    name: "social.sync-pet-identity",
    handle: (event: DeliveredEvent<PetArchived>) => syncPet(deps, event.payload.petId as Uuid),
  };
  return [onCreated, onUpdated, onArchived];
}
