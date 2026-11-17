import { type Clock, fixedClock } from "../../../../shared/clock";
import type { DomainEvent, EventOutbox } from "../../../../shared/events";
import type { Uuid } from "../../../../shared/ids";
import type { Transaction, UnitOfWork } from "../../../../shared/unit-of-work";
import type { Caretaker } from "../../domain/caretaker";
import type { Pet } from "../../domain/pet";
import type { CaretakerRepository, PetOwnershipCache, PetRepository, PetsDeps } from "../ports";

/*
 * Adaptadores en memoria para los tests unitarios de los casos de uso: herméticos, sin Postgres
 * ni Valkey. `MemoryPetsStore` restaura el estado si la transacción lanza (rollback simulado).
 * No simula bloqueos: la concurrencia del límite de 10 se prueba contra Postgres en `test/`.
 */

type State = {
  pets: Map<string, Pet>;
  caretakers: Map<string, Caretaker>;
  lockedOwners: string[];
  events: DomainEvent[];
};

const emptyState = (): State => ({
  pets: new Map(),
  caretakers: new Map(),
  lockedOwners: [],
  events: [],
});

export class MemoryPetsStore
  implements PetRepository, CaretakerRepository, EventOutbox, UnitOfWork
{
  state: State = emptyState();

  async run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    const snapshot = structuredClone(this.state);
    try {
      return await work(Object.freeze({}) as Transaction);
    } catch (error) {
      this.state = snapshot;
      throw error;
    }
  }

  async enqueue(_tx: Transaction, events: readonly DomainEvent[]): Promise<void> {
    this.state.events.push(...events);
  }

  // PetRepository
  async lockOwner(_tx: Transaction, ownerId: Uuid): Promise<void> {
    this.state.lockedOwners.push(ownerId);
  }

  async countActiveByOwner(_tx: Transaction, ownerId: Uuid): Promise<number> {
    return this.#active().filter((pet) => pet.ownerId === ownerId).length;
  }

  async insert(_tx: Transaction, pet: Pet): Promise<"inserted" | "handle-taken"> {
    if (this.#handleTaken(pet.handle, pet.id)) return "handle-taken";
    this.state.pets.set(pet.id, pet);
    return "inserted";
  }

  async update(_tx: Transaction, pet: Pet): Promise<"updated" | "handle-taken"> {
    if (this.#handleTaken(pet.handle, pet.id)) return "handle-taken";
    this.state.pets.set(pet.id, pet);
    return "updated";
  }

  async findById(_tx: Transaction, id: Uuid): Promise<Pet | null> {
    return this.state.pets.get(id) ?? null;
  }

  async findByIdForUpdate(tx: Transaction, id: Uuid): Promise<Pet | null> {
    return this.findById(tx, id);
  }

  async findByHandle(_tx: Transaction, handle: string): Promise<Pet | null> {
    return [...this.state.pets.values()].find((pet) => pet.handle.toLowerCase() === handle) ?? null;
  }

  async handleExists(tx: Transaction, handle: string): Promise<boolean> {
    return (await this.findByHandle(tx, handle)) !== null;
  }

  async listActiveByOwner(_tx: Transaction, ownerId: Uuid): Promise<Pet[]> {
    return this.#active()
      .filter((pet) => pet.ownerId === ownerId)
      .sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  // CaretakerRepository
  async find(_tx: Transaction, userId: Uuid): Promise<Caretaker | null> {
    return this.state.caretakers.get(userId) ?? null;
  }

  async save(_tx: Transaction, caretaker: Caretaker): Promise<void> {
    this.state.caretakers.set(caretaker.userId, caretaker);
  }

  #active(): Pet[] {
    return [...this.state.pets.values()].filter((pet) => pet.archivedAt === null);
  }

  #handleTaken(handle: string, exceptId: string): boolean {
    return [...this.state.pets.values()].some(
      (pet) => pet.id !== exceptId && pet.handle.toLowerCase() === handle.toLowerCase(),
    );
  }
}

/** Caché en memoria. `failing = true` simula Valkey caído. */
export class MemoryOwnershipCache implements PetOwnershipCache {
  readonly entries = new Map<string, Uuid>();
  failing = false;
  hits = 0;

  async get(petId: Uuid): Promise<Uuid | null> {
    this.#check();
    const owner = this.entries.get(petId) ?? null;
    if (owner !== null) this.hits += 1;
    return owner;
  }

  async set(petId: Uuid, ownerId: Uuid): Promise<void> {
    this.#check();
    this.entries.set(petId, ownerId);
  }

  async invalidate(petId: Uuid): Promise<void> {
    this.#check();
    this.entries.delete(petId);
  }

  #check() {
    if (this.failing) throw new Error("valkey no disponible");
  }
}

export type TestPetsDeps = PetsDeps & {
  store: MemoryPetsStore;
  cache: MemoryOwnershipCache;
  clock: Clock & { advance(ms: number): void };
  errors: unknown[];
};

export function createTestPetsDeps(start = new Date("2026-11-17T10:00:00Z")): TestPetsDeps {
  const store = new MemoryPetsStore();
  const cache = new MemoryOwnershipCache();
  const errors: unknown[] = [];
  return {
    store,
    cache,
    errors,
    unitOfWork: store,
    outbox: store,
    pets: store,
    caretakers: store,
    ownershipCache: cache,
    clock: fixedClock(start),
    reportError: (error) => errors.push(error),
  };
}
