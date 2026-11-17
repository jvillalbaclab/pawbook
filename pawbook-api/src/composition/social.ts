import type { Logger } from "pino";
import type { ActivePetMiddleware } from "../http/middleware/active-pet";
import type {
  PetProfileReader,
  RealtimeTokenPort,
  SocialDeps,
  SocialIdentityPort,
} from "../modules/social/application/ports";
import { socialRoutes } from "../modules/social/http/routes";
import {
  FakeRealtimeTokens,
  MemorySocialIdentity,
} from "../modules/social/infrastructure/fake-stream";
import { StreamRealtimeTokens } from "../modules/social/infrastructure/stream-realtime-tokens";
import { type Clock, systemClock } from "../shared/clock";
import type { Config } from "./config";

/*
 * Wiring del módulo social (fachada de GetStream). Qué es real y qué es falso hoy:
 * - Tokens: reales con STREAM_API_KEY/SECRET (se firman en local con el SDK, sin red). Sin
 *   credenciales, falsos en desarrollo y test, y deshabilitados (503) en producción para no
 *   repartir tokens que Stream rechazaría.
 * - Identidad (`pet_<id>`): siempre en memoria hasta el spike de GetStream (T-SP.*).
 */
export type SocialModuleOptions = {
  config: Config;
  logger: Logger;
  petProfiles: PetProfileReader;
  activePet: ActivePetMiddleware;
  overrides?: {
    clock?: Clock;
    tokens?: RealtimeTokenPort | null;
    identities?: SocialIdentityPort;
  };
};

function realtimeTokens(config: Config, logger: Logger): RealtimeTokenPort | null {
  if (config.STREAM_API_KEY !== "" && config.STREAM_API_SECRET !== "") {
    return new StreamRealtimeTokens(config.STREAM_API_KEY, config.STREAM_API_SECRET);
  }
  if (config.NODE_ENV === "production") {
    logger.warn("STREAM_API_KEY/STREAM_API_SECRET ausentes: /v1/stream/token deshabilitado");
    return null;
  }
  return new FakeRealtimeTokens();
}

/** Dependencias de los casos de uso; el worker las usa para los handlers del outbox. */
export function createSocialDeps(options: Omit<SocialModuleOptions, "activePet">): SocialDeps {
  const { config, logger, overrides = {} } = options;
  return {
    tokens: overrides.tokens !== undefined ? overrides.tokens : realtimeTokens(config, logger),
    identities: overrides.identities ?? new MemorySocialIdentity(),
    petProfiles: options.petProfiles,
    clock: overrides.clock ?? systemClock,
  };
}

export function createSocialModule(options: SocialModuleOptions) {
  const deps = createSocialDeps(options);
  return {
    deps,
    routes: socialRoutes({ social: deps, activePet: options.activePet }),
  };
}
