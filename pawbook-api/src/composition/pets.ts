import type Redis from "ioredis";
import type { Logger } from "pino";
import type { IdempotencyStore } from "../http/idempotency/store";
import { type ActivePetVerifier, createActivePetMiddleware } from "../http/middleware/active-pet";
import { getPetSocialProfile, verifyActivePet } from "../modules/pets/application/pets";
import type { PetOwnershipCache, PetsDeps } from "../modules/pets/application/ports";
import { petsRoutes } from "../modules/pets/http/routes";
import {
  DrizzleCaretakerRepository,
  DrizzlePetRepository,
} from "../modules/pets/infrastructure/drizzle-repositories";
import { ValkeyPetOwnershipCache } from "../modules/pets/infrastructure/valkey-ownership-cache";
import { type Clock, systemClock } from "../shared/clock";
import type { EventOutbox } from "../shared/events";
import { isUuidV7, type Uuid } from "../shared/ids";
import type { UnitOfWork } from "../shared/unit-of-work";

/*
 * Wiring del módulo pets: repositorios Drizzle, caché de propiedad en Valkey y el middleware
 * `activePet` que usarán los módulos sociales. Los tests sustituyen reloj y caché con `overrides`.
 */
export type PetsModuleOptions = {
  logger: Logger;
  unitOfWork: UnitOfWork;
  outbox: EventOutbox;
  valkey: Redis;
  idempotencyStore: IdempotencyStore;
  overrides?: {
    clock?: Clock;
    ownershipCache?: PetOwnershipCache;
  };
};

/** Dependencias de los casos de uso; el worker las usa sin montar rutas. */
export function createPetsDeps(options: Omit<PetsModuleOptions, "idempotencyStore">): PetsDeps {
  const { logger, overrides = {} } = options;
  return {
    unitOfWork: options.unitOfWork,
    outbox: options.outbox,
    pets: new DrizzlePetRepository(),
    caretakers: new DrizzleCaretakerRepository(),
    ownershipCache: overrides.ownershipCache ?? new ValkeyPetOwnershipCache(options.valkey),
    clock: overrides.clock ?? systemClock,
    // `context` lo construyen los casos de uso sin datos personales (NFR-OBS-002).
    reportError: (error, context) => logger.warn({ err: error, ...context }, "pets error"),
  };
}

export function createPetsModule(options: PetsModuleOptions) {
  const deps = createPetsDeps(options);

  const activePetVerifier: ActivePetVerifier = {
    // Los IDs que no son UUIDv7 no los genera la app: no existen, sin consultar nada.
    canActAs: (userId, petId) =>
      isUuidV7(petId) ? verifyActivePet(deps, userId as Uuid, petId) : Promise.resolve(false),
  };

  return {
    deps,
    routes: petsRoutes({ pets: deps, idempotencyStore: options.idempotencyStore }),
    activePet: createActivePetMiddleware(activePetVerifier),
    /** Lectura para social (sincronización con Stream). */
    petSocialProfile: (petId: Uuid) => getPetSocialProfile(deps, petId),
  };
}
