import type Redis from "ioredis";
import type { Uuid } from "../../../shared/ids";
import type { PetOwnershipCache } from "../application/ports";

/** Arquitectura §4.4: la propiedad de la mascota activa se cachea 60 s. */
export const OWNERSHIP_CACHE_TTL_MS = 60_000;

/*
 * `petId → ownerId` en Valkey con caducidad. Solo se guardan mascotas activas; archivar borra la
 * clave. Las réplicas de la API comparten la caché, así que la invalidación es inmediata para
 * todas.
 */
export class ValkeyPetOwnershipCache implements PetOwnershipCache {
  readonly #redis: Redis;
  readonly #prefix: string;
  readonly #ttlMs: number;

  /** `prefix` aísla las claves (`pets:owner:` en producción, `test:pets:owner:` en tests). */
  constructor(redis: Redis, options: { prefix?: string; ttlMs?: number } = {}) {
    this.#redis = redis;
    this.#prefix = options.prefix ?? "pets:owner:";
    this.#ttlMs = options.ttlMs ?? OWNERSHIP_CACHE_TTL_MS;
  }

  async get(petId: Uuid): Promise<Uuid | null> {
    return (await this.#redis.get(this.#key(petId))) as Uuid | null;
  }

  async set(petId: Uuid, ownerId: Uuid): Promise<void> {
    await this.#redis.set(this.#key(petId), ownerId, "PX", this.#ttlMs);
  }

  async invalidate(petId: Uuid): Promise<void> {
    await this.#redis.del(this.#key(petId));
  }

  #key(petId: Uuid): string {
    return `${this.#prefix}${petId}`;
  }
}
