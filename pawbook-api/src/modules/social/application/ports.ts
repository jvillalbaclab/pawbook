import type { Clock } from "../../../shared/clock";
import type { Uuid } from "../../../shared/ids";
import type { PetSocialProfile } from "../../pets/index";

/*
 * Puertos de social hacia GetStream (ADR-003: el dominio no importa `@stream-io/*`). Hoy solo
 * cubren la identidad (sincronizar la mascota como usuario de Stream) y los tokens del cliente;
 * `SocialFeedPort` y `ChatPort` (§3.4) llegarán con las publicaciones y PawMates.
 */

/** Firma tokens de usuario de Stream para el cliente (§5.3). No sale a la red. */
export interface RealtimeTokenPort {
  /** API key pública de la app de Stream, que el cliente necesita para conectarse. */
  readonly apiKey: string;
  userToken(streamUserId: string, issuedAt: Date, expiresAt: Date): string;
}

/** Datos con los que la mascota aparece en Stream: solo públicos, nada del responsable. */
export type SocialPetIdentity = {
  readonly streamUserId: string;
  readonly handle: string;
  readonly name: string;
  readonly avatarMediaId: Uuid | null;
};

/**
 * Mantiene el usuario `pet_<id>` de Stream al día con la mascota (T-M0.35). Las operaciones son
 * idempotentes ("upsert"): los handlers del outbox pueden reintentarlas sin efectos dobles.
 */
export interface SocialIdentityPort {
  upsertPet(identity: SocialPetIdentity): Promise<void>;
  /** Mascota archivada (FR-PET-006): deja de ser visible en Stream. */
  deactivatePet(streamUserId: string): Promise<void>;
}

/** Lectura del estado actual de una mascota; la composición la conecta con el módulo pets. */
export type PetProfileReader = (petId: Uuid) => Promise<PetSocialProfile | null>;

export type SocialDeps = {
  /** `null` si Stream no está configurado: `POST /v1/stream/token` responde 503. */
  readonly tokens: RealtimeTokenPort | null;
  readonly identities: SocialIdentityPort;
  readonly petProfiles: PetProfileReader;
  readonly clock: Clock;
};
