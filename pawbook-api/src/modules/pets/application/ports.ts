import type { Clock } from "../../../shared/clock";
import type { EventOutbox } from "../../../shared/events";
import type { Uuid } from "../../../shared/ids";
import type { Transaction, UnitOfWork } from "../../../shared/unit-of-work";
import type { Caretaker } from "../domain/caretaker";
import type { Pet } from "../domain/pet";

/*
 * Puertos de pets. Los adaptadores (Drizzle, Valkey) viven en `infrastructure/` y se conectan en
 * la composición. Todo acceso a datos recibe la transacción de `UnitOfWork.run`.
 */

export interface PetRepository {
  /**
   * Serializa las altas de un mismo usuario: crea si hace falta su fila de responsable y la
   * bloquea (`SELECT ... FOR UPDATE`) hasta el fin de la transacción. Contar y crear después de
   * esto es seguro aunque lleguen dos `POST /v1/pets` a la vez (límite de 10, FR-PET-001).
   */
  lockOwner(tx: Transaction, ownerId: Uuid, now: Date): Promise<void>;
  countActiveByOwner(tx: Transaction, ownerId: Uuid): Promise<number>;
  /** `handle-taken` si el handle ya existe (en cualquier capitalización), también en carrera. */
  insert(tx: Transaction, pet: Pet): Promise<"inserted" | "handle-taken">;
  /** Persiste el estado completo de la mascota. `handle-taken` si el nuevo handle está ocupado. */
  update(tx: Transaction, pet: Pet): Promise<"updated" | "handle-taken">;
  findById(tx: Transaction, id: Uuid): Promise<Pet | null>;
  /** Bloquea la fila: dos ediciones simultáneas no pueden saltarse el límite de cambio de handle. */
  findByIdForUpdate(tx: Transaction, id: Uuid): Promise<Pet | null>;
  findByHandle(tx: Transaction, handle: string): Promise<Pet | null>;
  handleExists(tx: Transaction, handle: string): Promise<boolean>;
  /** Mascotas activas del usuario, de la más antigua a la más reciente (máximo 10). */
  listActiveByOwner(tx: Transaction, ownerId: Uuid): Promise<Pet[]>;
}

export interface CaretakerRepository {
  find(tx: Transaction, userId: Uuid): Promise<Caretaker | null>;
  save(tx: Transaction, caretaker: Caretaker, now: Date): Promise<void>;
}

/**
 * Caché de propiedad de la mascota activa (arquitectura §4.4): `petId → ownerId` de mascotas
 * activas durante 60 s. Es solo una optimización: si falla, se consulta la base de datos.
 */
export interface PetOwnershipCache {
  get(petId: Uuid): Promise<Uuid | null>;
  set(petId: Uuid, ownerId: Uuid): Promise<void>;
  /** Se llama al archivar (y, cuando exista, al transferir) la mascota. */
  invalidate(petId: Uuid): Promise<void>;
}

export type PetsDeps = {
  readonly unitOfWork: UnitOfWork;
  readonly outbox: EventOutbox;
  readonly pets: PetRepository;
  readonly caretakers: CaretakerRepository;
  readonly ownershipCache: PetOwnershipCache;
  readonly clock: Clock;
  /** Informa de un fallo no fatal (p. ej. Valkey caído). `context` nunca lleva PII. */
  readonly reportError: (error: unknown, context: Record<string, string>) => void;
};
