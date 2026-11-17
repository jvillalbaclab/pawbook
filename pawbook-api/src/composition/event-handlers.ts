import { getPetSocialProfile } from "../modules/pets/application/pets";
import { petIdentityHandlers } from "../modules/social/application/pet-identity-sync";
import type { Container } from "./container";
import { createPetsDeps } from "./pets";
import { createSocialDeps } from "./social";

/*
 * Handlers de eventos de los módulos que ejecuta el worker. Hoy: sincronizar cada mascota con su
 * usuario de Stream (`pets.pet-*` → social, T-M0.35).
 */
export function registerModuleEventHandlers(container: Container): void {
  const { config, logger } = container;
  const pets = createPetsDeps({
    logger,
    unitOfWork: container.unitOfWork,
    outbox: container.outbox,
    valkey: container.valkey,
  });
  const social = createSocialDeps({
    config,
    logger,
    petProfiles: (petId) => getPetSocialProfile(pets, petId),
  });
  container.eventHandlers.push(...petIdentityHandlers(social));
}
