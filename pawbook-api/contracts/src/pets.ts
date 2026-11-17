import { z } from "@hono/zod-openapi";

/*
 * Contrato de mascotas: `/v1/me/pets`, `/v1/pets/*` y los ajustes del responsable (arquitectura
 * §4.5, FR-PET-001..008). La mascota activa de las acciones sociales viaja en `X-Pet-Id` (§4.4).
 */

export const PET_HANDLE_MIN_LENGTH = 3;
export const PET_HANDLE_MAX_LENGTH = 30;
/**
 * Formato del handle ya normalizado (FR-PET-002). La API además exige al menos una letra o un
 * dígito y rechaza handles reservados; `GET /v1/pets/handles/{handle}/availability` lo dice todo.
 */
export const PET_HANDLE_PATTERN = /^[a-z0-9_.]{3,30}$/;
export const PET_NAME_MAX_LENGTH = 40;
export const PET_BIO_MAX_LENGTH = 300;
export const PET_SHORT_TEXT_MAX_LENGTH = 60;
export const MAX_ACTIVE_PETS_PER_USER = 10;
export const HANDLE_CHANGE_COOLDOWN_DAYS = 30;
export const CARETAKER_FIRST_NAME_MAX_LENGTH = 40;

export const SpeciesSchema = z.enum(["dog", "cat"]).openapi({ description: "Especie." });
export const SexSchema = z.enum(["female", "male"]).openapi({ description: "Sexo." });

/** Lo que escribe el usuario: admite `@` inicial y mayúsculas; la API normaliza. */
export const PetHandleInputSchema = z
  .string()
  .min(1)
  .max(PET_HANDLE_MAX_LENGTH + 1)
  .openapi({
    description: `@handle único (${PET_HANDLE_MIN_LENGTH}-${PET_HANDLE_MAX_LENGTH} caracteres de \`[a-z0-9_.]\`). Se guarda en minúsculas y sin \`@\`.`,
    example: "luna.gato",
  });

const nullableText = (max: number, description: string) =>
  z.string().max(max).nullable().optional().openapi({ description });

const BirthMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato AAAA-MM")
  .nullable()
  .optional()
  .openapi({ description: "Fecha de nacimiento aproximada (AAAA-MM).", example: "2023-05" });

const MediaIdSchema = (description: string) =>
  z
    .uuid()
    .nullable()
    .optional()
    .openapi({
      description: `${description} ID de un medio del módulo media (M1); hoy no se valida.`,
    });

const profileFields = {
  name: z
    .string()
    .trim()
    .min(1)
    .max(PET_NAME_MAX_LENGTH)
    .openapi({ description: "Nombre visible.", example: "Luna" }),
  species: SpeciesSchema,
  sex: SexSchema,
  breed: nullableText(PET_SHORT_TEXT_MAX_LENGTH, "Raza: del catálogo del cliente o texto libre."),
  birthMonth: BirthMonthSchema,
  bio: nullableText(PET_BIO_MAX_LENGTH, `Bio (≤ ${PET_BIO_MAX_LENGTH} caracteres).`),
  favoriteToy: nullableText(PET_SHORT_TEXT_MAX_LENGTH, "Juguete favorito."),
  favoriteTreat: nullableText(PET_SHORT_TEXT_MAX_LENGTH, "Premio favorito."),
  avatarMediaId: MediaIdSchema("Foto de perfil."),
  coverMediaId: MediaIdSchema("Portada."),
};

export const CreatePetRequestSchema = z
  .object({ handle: PetHandleInputSchema, ...profileFields })
  .openapi("CreatePetRequest");

export const UpdatePetRequestSchema = z
  .object({
    handle: PetHandleInputSchema.optional().openapi({
      description: `Nuevo @handle. Se puede cambiar una vez cada ${HANDLE_CHANGE_COOLDOWN_DAYS} días (el elegido al crear la mascota no cuenta).`,
    }),
    name: profileFields.name.optional(),
    species: SpeciesSchema.optional(),
    sex: SexSchema.optional(),
    breed: profileFields.breed,
    birthMonth: profileFields.birthMonth,
    bio: profileFields.bio,
    favoriteToy: profileFields.favoriteToy,
    favoriteTreat: profileFields.favoriteTreat,
    avatarMediaId: profileFields.avatarMediaId,
    coverMediaId: profileFields.coverMediaId,
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "Indica al menos un campo",
  })
  .openapi("UpdatePetRequest", {
    description: "Solo se cambian los campos presentes. `null` vacía un campo opcional.",
  });

const petBase = {
  id: z.uuid(),
  handle: z.string().openapi({ example: "luna.gato" }),
  name: z.string(),
  species: SpeciesSchema,
  sex: SexSchema,
  breed: z.string().nullable(),
  birthMonth: z.string().nullable().openapi({ example: "2023-05" }),
  bio: z.string().nullable(),
  favoriteToy: z.string().nullable(),
  favoriteTreat: z.string().nullable(),
  avatarMediaId: z.uuid().nullable(),
  coverMediaId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
};

/** Mascota vista por su responsable. */
export const PetSchema = z
  .object({
    ...petBase,
    status: z.enum(["active", "archived"]),
    updatedAt: z.iso.datetime(),
    handleChangedAt: z.iso.datetime().nullable().openapi({
      description: "Último cambio de handle; `null` si conserva el elegido al crearla.",
    }),
    nextHandleChangeAt: z.iso.datetime().nullable().openapi({
      description: "Desde cuándo se puede volver a cambiar el handle; `null` si ya se puede.",
    }),
  })
  .openapi("Pet");

/** Perfil público (FR-PET-003, FR-FEED-010): sin datos del responsable salvo su nombre de pila. */
export const PublicPetSchema = z
  .object({
    ...petBase,
    caretaker: z
      .object({ firstName: z.string().openapi({ example: "Laura" }) })
      .nullable()
      .openapi({
        description:
          "Responsable visible (FR-PET-008). `null` si lo oculta en los ajustes o no ha indicado su nombre.",
      }),
  })
  .openapi("PublicPet");

export const MyPetsSchema = z
  .object({
    items: z
      .array(PetSchema)
      .max(MAX_ACTIVE_PETS_PER_USER)
      .openapi({
        description: `Mascotas activas, de la más antigua a la más reciente (máximo ${MAX_ACTIVE_PETS_PER_USER}).`,
      }),
  })
  .openapi("MyPets");

export const HandleAvailabilitySchema = z
  .object({
    handle: z.string().openapi({ description: "Handle normalizado que se comprobó." }),
    available: z.boolean(),
    reason: z.enum(["invalid", "reserved", "taken"]).nullable().openapi({
      description:
        "`invalid`: no cumple el formato · `reserved`: no se puede usar · `taken`: ya es de otra mascota · `null` si está libre.",
    }),
  })
  .openapi("HandleAvailability");

export const CaretakerProfileSchema = z
  .object({
    firstName: z.string().nullable().openapi({
      description: "Nombre de pila que se muestra como «Responsable: …». Nunca apellidos.",
      example: "Laura",
    }),
    showFirstName: z.boolean().openapi({
      description: "Si se muestra en el perfil de las mascotas (por defecto, sí).",
    }),
  })
  .openapi("CaretakerProfile");

export const UpdateCaretakerProfileRequestSchema = z
  .object({
    firstName: z.string().max(CARETAKER_FIRST_NAME_MAX_LENGTH).nullable().optional(),
    showFirstName: z.boolean().optional(),
  })
  .refine((body) => body.firstName !== undefined || body.showFirstName !== undefined, {
    message: "Indica al menos un campo",
  })
  .openapi("UpdateCaretakerProfileRequest");

export const PetIdParamSchema = z.object({
  id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});

export const PetHandleParamSchema = z.object({
  handle: z
    .string()
    .min(1)
    .max(PET_HANDLE_MAX_LENGTH + 1)
    .openapi({ param: { name: "handle", in: "path" }, example: "luna.gato" }),
});

/** Cabecera de la mascota activa (arquitectura §4.4, FR-PET-005). */
export const ActivePetHeadersSchema = z.object({
  "x-pet-id": z.uuid().openapi({
    description:
      "Mascota activa en cuyo nombre se actúa. Debe ser del usuario autenticado y no estar archivada.",
  }),
});

export type CreatePetRequest = z.infer<typeof CreatePetRequestSchema>;
export type UpdatePetRequest = z.infer<typeof UpdatePetRequestSchema>;
export type Pet = z.infer<typeof PetSchema>;
export type PublicPet = z.infer<typeof PublicPetSchema>;
export type HandleAvailability = z.infer<typeof HandleAvailabilitySchema>;
export type CaretakerProfile = z.infer<typeof CaretakerProfileSchema>;
