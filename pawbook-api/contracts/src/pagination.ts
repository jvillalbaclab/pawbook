import { z } from "@hono/zod-openapi";

/** Tamaño de página por defecto y máximo de cualquier colección (COM-004). */
export const PAGE_LIMIT_DEFAULT = 20;
export const PAGE_LIMIT_MAX = 50;

/**
 * Query `?cursor=&limit=` de cualquier colección. El cursor es opaco: el cliente lo copia de
 * `nextCursor` sin interpretarlo. Su validez la comprueba la API al decodificarlo (400 si
 * está corrupto); aquí solo se valida que sea texto.
 */
export const PaginationQuerySchema = z.object({
  cursor: z
    .string()
    .min(1)
    .optional()
    .openapi({ description: "Cursor opaco devuelto en `nextCursor` de la página anterior." }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGE_LIMIT_MAX)
    .default(PAGE_LIMIT_DEFAULT)
    .openapi({ description: `Elementos por página (máximo ${PAGE_LIMIT_MAX}).`, example: 20 }),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * Respuesta paginada `{ items, nextCursor }`. `nextCursor` es `null` en la última página.
 * Uso: `pageSchema(PetSchema).openapi("PetPage")`.
 */
export function pageSchema<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    nextCursor: z
      .string()
      .nullable()
      .openapi({ description: "Cursor de la página siguiente; `null` si no hay más." }),
  });
}

export type Page<Item> = { items: Item[]; nextCursor: string | null };
