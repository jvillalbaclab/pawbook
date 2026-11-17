import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { dbTransaction } from "../../../infrastructure/db/database";
import type { Uuid } from "../../../shared/ids";
import type { Transaction } from "../../../shared/unit-of-work";
import type { CaretakerRepository, PetRepository } from "../application/ports";
import type { Caretaker } from "../domain/caretaker";
import type { Pet } from "../domain/pet";
import { caretakers, petsTable } from "./schema";

/*
 * Repositorios Drizzle de pets. Todos trabajan sobre la transacción del caso de uso. Las columnas
 * `uuid` vuelven como `string`; se marcan como `Uuid` porque las escribe la app con `uuidv7()`.
 */

type PetRow = typeof petsTable.$inferSelect;

const toBirthMonth = (value: string | null) => (value === null ? null : value.slice(0, 7));
const fromBirthMonth = (value: string | null) => (value === null ? null : `${value}-01`);

const toPet = (row: PetRow): Pet => ({
  id: row.id as Uuid,
  ownerId: row.ownerId as Uuid,
  handle: row.handle,
  name: row.name,
  species: row.species,
  sex: row.sex,
  breed: row.breed,
  birthMonth: toBirthMonth(row.birthMonth),
  bio: row.bio,
  favoriteToy: row.favoriteToy,
  favoriteTreat: row.favoriteTreat,
  avatarMediaId: row.avatarMediaId as Uuid | null,
  coverMediaId: row.coverMediaId as Uuid | null,
  handleChangedAt: row.handleChangedAt,
  archivedAt: row.archivedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toRow = (pet: Pet): PetRow => ({ ...pet, birthMonth: fromBirthMonth(pet.birthMonth) });

const handleMatches = (handle: string) => sql`lower(${petsTable.handle}) = lower(${handle})`;

export class DrizzlePetRepository implements PetRepository {
  async lockOwner(tx: Transaction, ownerId: Uuid, now: Date): Promise<void> {
    const db = dbTransaction(tx);
    // Si dos altas crean la fila a la vez, la segunda espera al índice de la primera y no
    // inserta nada; después ambas compiten por el FOR UPDATE y se ejecutan de una en una.
    await db
      .insert(caretakers)
      .values({ userId: ownerId, createdAt: now, updatedAt: now })
      .onConflictDoNothing({ target: caretakers.userId });
    await db
      .select({ userId: caretakers.userId })
      .from(caretakers)
      .where(eq(caretakers.userId, ownerId))
      .for("update");
  }

  async countActiveByOwner(tx: Transaction, ownerId: Uuid): Promise<number> {
    const [row] = await dbTransaction(tx)
      .select({ total: count() })
      .from(petsTable)
      .where(and(eq(petsTable.ownerId, ownerId), isNull(petsTable.archivedAt)));
    return row?.total ?? 0;
  }

  async insert(tx: Transaction, pet: Pet): Promise<"inserted" | "handle-taken"> {
    // ON CONFLICT DO NOTHING en vez de capturar el 23505: un error abortaría la transacción.
    // Sin `target`: el único conflicto posible es el índice de `lower(handle)` (el ID es nuevo).
    const inserted = await dbTransaction(tx)
      .insert(petsTable)
      .values(toRow(pet))
      .onConflictDoNothing()
      .returning({ id: petsTable.id });
    return inserted.length === 1 ? "inserted" : "handle-taken";
  }

  async update(tx: Transaction, pet: Pet): Promise<"updated" | "handle-taken"> {
    const db = dbTransaction(tx);
    // Un UPDATE no admite ON CONFLICT: se comprueba antes, y la carrera entre dos mascotas que
    // piden el mismo handle a la vez la resuelve el índice único. El UPDATE va en un SAVEPOINT
    // (transacción anidada) para que el 23505 no aborte la transacción del caso de uso.
    const [clash] = await db
      .select({ id: petsTable.id })
      .from(petsTable)
      .where(and(handleMatches(pet.handle), sql`${petsTable.id} <> ${pet.id}`));
    if (clash !== undefined) return "handle-taken";
    const { id, ...values } = toRow(pet);
    try {
      await db.transaction(async (savepoint) => {
        await savepoint.update(petsTable).set(values).where(eq(petsTable.id, id));
      });
    } catch (error) {
      if (isUniqueViolation(error)) return "handle-taken";
      throw error;
    }
    return "updated";
  }

  async findById(tx: Transaction, id: Uuid): Promise<Pet | null> {
    const [row] = await dbTransaction(tx).select().from(petsTable).where(eq(petsTable.id, id));
    return row === undefined ? null : toPet(row);
  }

  async findByIdForUpdate(tx: Transaction, id: Uuid): Promise<Pet | null> {
    const [row] = await dbTransaction(tx)
      .select()
      .from(petsTable)
      .where(eq(petsTable.id, id))
      .for("update");
    return row === undefined ? null : toPet(row);
  }

  async findByHandle(tx: Transaction, handle: string): Promise<Pet | null> {
    const [row] = await dbTransaction(tx).select().from(petsTable).where(handleMatches(handle));
    return row === undefined ? null : toPet(row);
  }

  async handleExists(tx: Transaction, handle: string): Promise<boolean> {
    const [row] = await dbTransaction(tx)
      .select({ id: petsTable.id })
      .from(petsTable)
      .where(handleMatches(handle));
    return row !== undefined;
  }

  async listActiveByOwner(tx: Transaction, ownerId: Uuid): Promise<Pet[]> {
    const rows = await dbTransaction(tx)
      .select()
      .from(petsTable)
      .where(and(eq(petsTable.ownerId, ownerId), isNull(petsTable.archivedAt)))
      .orderBy(asc(petsTable.id));
    return rows.map(toPet);
  }
}

/** 23505 = unique_violation. Drizzle envuelve el error del driver en `cause`. */
function isUniqueViolation(error: unknown): boolean {
  for (let current: unknown = error; current instanceof Error; current = current.cause) {
    if ((current as { code?: unknown }).code === "23505") return true;
  }
  return false;
}

export class DrizzleCaretakerRepository implements CaretakerRepository {
  async find(tx: Transaction, userId: Uuid): Promise<Caretaker | null> {
    const [row] = await dbTransaction(tx)
      .select()
      .from(caretakers)
      .where(eq(caretakers.userId, userId));
    return row === undefined
      ? null
      : { userId: row.userId as Uuid, firstName: row.firstName, showFirstName: row.showFirstName };
  }

  async save(tx: Transaction, caretaker: Caretaker, now: Date): Promise<void> {
    const values = { firstName: caretaker.firstName, showFirstName: caretaker.showFirstName };
    await dbTransaction(tx)
      .insert(caretakers)
      .values({ userId: caretaker.userId, ...values, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: caretakers.userId, set: { ...values, updatedAt: now } });
  }
}
