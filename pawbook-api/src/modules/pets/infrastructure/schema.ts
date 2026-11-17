import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Sex, Species } from "../domain/pet";

/*
 * Esquema `pets` (arquitectura §8). IDs UUIDv7 generados en la app y `timestamptz` (OR-DB-002).
 *
 * `owner_id` y `user_id` referencian `identity.users(id)` solo por valor, sin FK entre esquemas:
 * declararla obligaría a importar el esquema Drizzle de identity (rompe la frontera del módulo,
 * §4.2) y acoplaría las migraciones de ambos. La limpieza al borrar la cuenta llegará por el
 * evento `UserDeleted` (§4.2, FR-AUTH-008).
 */
export const pets = pgSchema("pets");

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const petsTable = pets.table(
  "pets",
  {
    id: uuid("id").primaryKey(),
    /** Usuario responsable. Co-propietarios (FR-PET-007) irían en una tabla aparte. */
    ownerId: uuid("owner_id").notNull(),
    /** Normalizado a minúsculas por el dominio; la unicidad es sobre `lower(handle)`. */
    handle: text("handle").notNull(),
    name: text("name").notNull(),
    species: text("species").$type<Species>().notNull(),
    sex: text("sex").$type<Sex>().notNull(),
    breed: text("breed"),
    /** Fecha aproximada: se guarda el día 1 del mes (`AAAA-MM-01`). */
    birthMonth: date("birth_month", { mode: "string" }),
    bio: text("bio"),
    favoriteToy: text("favorite_toy"),
    favoriteTreat: text("favorite_treat"),
    avatarMediaId: uuid("avatar_media_id"),
    coverMediaId: uuid("cover_media_id"),
    handleChangedAt: timestamptz("handle_changed_at"),
    archivedAt: timestamptz("archived_at"),
    createdAt: timestamptz("created_at").notNull(),
    updatedAt: timestamptz("updated_at").notNull(),
  },
  (table) => [
    // FR-PET-002: único global sin distinguir mayúsculas, aunque llegue un valor sin normalizar.
    uniqueIndex("pets_handle_lower_key").on(sql`lower(${table.handle})`),
    // Defensa en profundidad del formato que valida el dominio.
    check("pets_handle_format", sql`${table.handle} ~ '^[a-z0-9_.]{3,30}$'`),
    check("pets_species_valid", sql`${table.species} in ('dog', 'cat')`),
    check("pets_sex_valid", sql`${table.sex} in ('female', 'male')`),
    // Mascotas activas de un usuario: `/me/pets`, el límite de 10 y el selector de la web.
    index("pets_owner_active_idx")
      .on(table.ownerId, table.id)
      .where(sql`${table.archivedAt} is null`),
  ],
);

/**
 * Responsable tal como aparece en sus mascotas (FR-PET-008). Su fila también es el cerrojo por
 * usuario que serializa las altas de mascotas (`PetRepository.lockOwner`).
 */
export const caretakers = pets.table("caretakers", {
  userId: uuid("user_id").primaryKey(),
  firstName: text("first_name"),
  showFirstName: boolean("show_first_name").notNull().default(true),
  createdAt: timestamptz("created_at").notNull(),
  updatedAt: timestamptz("updated_at").notNull(),
});
