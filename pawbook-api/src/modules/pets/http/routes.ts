import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  CaretakerProfileSchema,
  CreatePetRequestSchema,
  HandleAvailabilitySchema,
  IdempotencyHeadersSchema,
  MyPetsSchema,
  PetHandleParamSchema,
  PetIdParamSchema,
  PetSchema,
  ProblemSchema,
  PublicPetSchema,
  UpdateCaretakerProfileRequestSchema,
  UpdatePetRequestSchema,
} from "@pawbook/contracts";
import { idempotency } from "../../../http/idempotency/middleware";
import type { IdempotencyStore } from "../../../http/idempotency/store";
import {
  authenticatedUser,
  requireAuth,
  requireVerifiedEmail,
} from "../../../http/middleware/auth";
import type { AppEnv } from "../../../http/types";
import { AppError } from "../../../shared/errors";
import type { Uuid } from "../../../shared/ids";
import { getCaretaker, updateCaretaker } from "../application/caretaker";
import {
  archivePet,
  checkHandleAvailability,
  createPet,
  getPublicProfile,
  listMyPets,
  type PetError,
  type PublicPetProfile,
  updatePet,
} from "../application/pets";
import type { PetsDeps } from "../application/ports";
import type { Caretaker } from "../domain/caretaker";
import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH, nextHandleChangeAt } from "../domain/handle";
import { type Pet, petStatus } from "../domain/pet";

/*
 * Rutas de pets bajo /v1 (arquitectura §4.5). Crear y editar exige el correo verificado
 * (FR-AUTH-006); el perfil público se sirve sin sesión (FR-FEED-010).
 */

export type PetsRoutesOptions = {
  readonly pets: PetsDeps;
  readonly idempotencyStore: IdempotencyStore;
};

const json = <T>(schema: T, description: string) => ({
  description,
  content: { "application/json": { schema } },
});
const problem = (description: string) => ({
  description,
  content: { "application/problem+json": { schema: ProblemSchema } },
});
const tooManyRequests = { $ref: "#/components/responses/TooManyRequests" };
const unauthorizedRef = { $ref: "#/components/responses/Unauthorized" };
const bearer = [{ bearerAuth: [] }];
const emailNotVerified = problem("Correo sin verificar (`email-not-verified`, FR-AUTH-006)");

// ---------------------------------------------------------------------------- serialización

const iso = (date: Date | null) => (date === null ? null : date.toISOString());

function publicFields(pet: Pet) {
  return {
    id: pet.id,
    handle: pet.handle,
    name: pet.name,
    species: pet.species,
    sex: pet.sex,
    breed: pet.breed,
    birthMonth: pet.birthMonth,
    bio: pet.bio,
    favoriteToy: pet.favoriteToy,
    favoriteTreat: pet.favoriteTreat,
    avatarMediaId: pet.avatarMediaId,
    coverMediaId: pet.coverMediaId,
    createdAt: pet.createdAt.toISOString(),
  };
}

function petBody(pet: Pet, now: Date) {
  const next = nextHandleChangeAt(pet.handleChangedAt);
  return {
    ...publicFields(pet),
    status: petStatus(pet),
    updatedAt: pet.updatedAt.toISOString(),
    handleChangedAt: iso(pet.handleChangedAt),
    nextHandleChangeAt: next !== null && next > now ? next.toISOString() : null,
  };
}

function publicPetBody({ pet, caretakerFirstName }: PublicPetProfile) {
  return {
    ...publicFields(pet),
    caretaker: caretakerFirstName === null ? null : { firstName: caretakerFirstName },
  };
}

const caretakerBody = (caretaker: Caretaker) => ({
  firstName: caretaker.firstName,
  showFirstName: caretaker.showFirstName,
});

// ---------------------------------------------------------------------- errores de negocio

const longDate = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function petError(error: PetError): AppError {
  const handleField = (message: string) => [{ path: "handle", message }];
  switch (error.code) {
    case "handle-invalid":
      return new AppError("validation-failed", {
        errors: handleField(
          `Entre ${HANDLE_MIN_LENGTH} y ${HANDLE_MAX_LENGTH} caracteres: letras minúsculas, números, punto o guion bajo, con al menos una letra o número`,
        ),
      });
    case "handle-reserved":
      return new AppError("validation-failed", {
        errors: handleField("Este usuario está reservado. Elige otro"),
      });
    case "handle-taken":
      return new AppError("conflict", {
        detail: "Ese usuario ya lo tiene otra mascota. Prueba con otro.",
        errors: handleField("Ya está en uso"),
      });
    case "handle-change-too-soon":
      return new AppError("conflict", {
        detail: `Solo puedes cambiar el usuario una vez cada 30 días. Podrás cambiarlo a partir del ${longDate.format(error.nextChangeAt)}.`,
        errors: handleField("Cambiado hace menos de 30 días"),
      });
    case "pet-limit-reached":
      return new AppError("conflict", {
        detail: `Ya tienes ${error.limit} mascotas activas, el máximo. Archiva una para añadir otra.`,
      });
    case "invalid-profile":
      return new AppError("validation-failed", {
        errors: error.problems.map((item) => ({ path: item.field, message: item.message })),
      });
    case "not-found":
      return new AppError("not-found", { detail: "No encontramos esa mascota entre las tuyas." });
  }
}

// --------------------------------------------------------------------------------- rutas

const tags = ["Mascotas"];

export function petsRoutes(options: PetsRoutesOptions) {
  const deps = options.pets;

  const myPetsRoute = createRoute({
    method: "get",
    path: "/me/pets",
    tags,
    summary: "Mascotas activas del usuario autenticado",
    description: "Para el selector de mascota activa (UI-003). Como máximo 10, sin paginación.",
    middleware: [requireAuth],
    security: bearer,
    responses: { 200: json(MyPetsSchema, "Mascotas"), 401: unauthorizedRef, 429: tooManyRequests },
  });

  const createPetRoute = createRoute({
    method: "post",
    path: "/pets",
    tags,
    summary: "Crea una mascota",
    description:
      "FR-PET-001 y FR-PET-002. Máximo 10 mascotas activas por usuario. Exige el correo verificado. Admite `Idempotency-Key`.",
    middleware: [requireVerifiedEmail, idempotency({ store: options.idempotencyStore })],
    security: bearer,
    request: {
      headers: IdempotencyHeadersSchema,
      body: { content: { "application/json": { schema: CreatePetRequestSchema } }, required: true },
    },
    responses: {
      201: json(PetSchema, "Mascota creada"),
      401: unauthorizedRef,
      403: emailNotVerified,
      409: problem("Handle ocupado o límite de 10 mascotas alcanzado"),
      422: problem("Datos no válidos o handle reservado"),
      429: tooManyRequests,
    },
  });

  const handleAvailabilityRoute = createRoute({
    method: "get",
    path: "/pets/handles/{handle}/availability",
    tags,
    summary: "Comprueba si un @handle está libre",
    description:
      "Para el onboarding (T-M0.41): normaliza el handle (minúsculas, sin `@`) y dice si se puede registrar. Es orientativo: el alta puede fallar con 409 si otro lo ocupa entretanto.",
    middleware: [requireAuth],
    security: bearer,
    request: { params: PetHandleParamSchema },
    responses: {
      200: json(HandleAvailabilitySchema, "Resultado"),
      401: unauthorizedRef,
      429: tooManyRequests,
    },
  });

  const publicProfileRoute = createRoute({
    method: "get",
    path: "/pets/{handle}",
    tags,
    summary: "Perfil público de una mascota",
    description:
      "FR-PET-003 y FR-FEED-010: no exige sesión. Incluye el nombre de pila del responsable salvo que lo oculte (FR-PET-008). Las mascotas archivadas responden 404.",
    request: { params: PetHandleParamSchema },
    responses: {
      200: json(PublicPetSchema, "Perfil"),
      404: problem("No existe o está archivada"),
      429: tooManyRequests,
    },
  });

  const updatePetRoute = createRoute({
    method: "patch",
    path: "/pets/{id}",
    tags,
    summary: "Edita una mascota propia",
    description:
      "FR-PET-004 y FR-PET-002. Solo el responsable; para cualquier otro usuario responde 404. El handle se puede cambiar una vez cada 30 días.",
    middleware: [requireVerifiedEmail],
    security: bearer,
    request: {
      params: PetIdParamSchema,
      body: { content: { "application/json": { schema: UpdatePetRequestSchema } }, required: true },
    },
    responses: {
      200: json(PetSchema, "Mascota actualizada"),
      401: unauthorizedRef,
      403: emailNotVerified,
      404: problem("No existe, está archivada o no es tuya"),
      409: problem("Handle ocupado o cambiado hace menos de 30 días"),
      422: problem("Datos no válidos o handle reservado"),
      429: tooManyRequests,
    },
  });

  const archivePetRoute = createRoute({
    method: "post",
    path: "/pets/{id}/archive",
    tags,
    summary: "Archiva una mascota propia",
    description:
      "FR-PET-006: el perfil y su contenido dejan de verse para terceros y ya no puede ser la mascota activa. Es idempotente. El handle sigue reservado.",
    middleware: [requireVerifiedEmail],
    security: bearer,
    request: { params: PetIdParamSchema },
    responses: {
      204: { description: "Mascota archivada" },
      401: unauthorizedRef,
      403: emailNotVerified,
      404: problem("No existe o no es tuya"),
      429: tooManyRequests,
    },
  });

  const getCaretakerRoute = createRoute({
    method: "get",
    path: "/me/caretaker-profile",
    tags,
    summary: "Cómo apareces como responsable en tus mascotas",
    description: "FR-PET-008: nombre de pila y si se muestra («Responsable: Laura»).",
    middleware: [requireAuth],
    security: bearer,
    responses: {
      200: json(CaretakerProfileSchema, "Ajustes del responsable"),
      401: unauthorizedRef,
      429: tooManyRequests,
    },
  });

  const updateCaretakerRoute = createRoute({
    method: "patch",
    path: "/me/caretaker-profile",
    tags,
    summary: "Cambia tu nombre de pila o lo oculta de tus mascotas",
    description:
      "FR-PET-008 y US-06. Solo el nombre de pila: nunca apellidos ni datos de contacto. `firstName: null` lo borra.",
    middleware: [requireAuth],
    security: bearer,
    request: {
      body: {
        content: { "application/json": { schema: UpdateCaretakerProfileRequestSchema } },
        required: true,
      },
    },
    responses: {
      200: json(CaretakerProfileSchema, "Ajustes guardados"),
      401: unauthorizedRef,
      422: problem("Nombre no válido"),
      429: tooManyRequests,
    },
  });

  return new OpenAPIHono<AppEnv>()
    .openapi(myPetsRoute, async (c) => {
      const { userId } = authenticatedUser(c);
      const pets = await listMyPets(deps, userId as Uuid);
      const now = deps.clock.now();
      return c.json({ items: pets.map((pet) => petBody(pet, now)) }, 200);
    })
    .openapi(createPetRoute, async (c) => {
      const { userId } = authenticatedUser(c);
      const body = c.req.valid("json");
      const result = await createPet(deps, userId as Uuid, {
        ...body,
        avatarMediaId: body.avatarMediaId as Uuid | null | undefined,
        coverMediaId: body.coverMediaId as Uuid | null | undefined,
      });
      if (!result.ok) throw petError(result.error);
      c.header("Location", `/v1/pets/${result.value.handle}`);
      return c.json(petBody(result.value, deps.clock.now()), 201);
    })
    .openapi(handleAvailabilityRoute, async (c) => {
      const result = await checkHandleAvailability(deps, c.req.valid("param").handle);
      return c.json(result, 200);
    })
    .openapi(publicProfileRoute, async (c) => {
      const profile = await getPublicProfile(deps, c.req.valid("param").handle);
      if (profile === null) {
        throw new AppError("not-found", { detail: "Esta mascota no existe o está archivada." });
      }
      return c.json(publicPetBody(profile), 200);
    })
    .openapi(updatePetRoute, async (c) => {
      const { userId } = authenticatedUser(c);
      const body = c.req.valid("json");
      const result = await updatePet(deps, userId as Uuid, c.req.valid("param").id as Uuid, {
        ...body,
        avatarMediaId: body.avatarMediaId as Uuid | null | undefined,
        coverMediaId: body.coverMediaId as Uuid | null | undefined,
      });
      if (!result.ok) throw petError(result.error);
      return c.json(petBody(result.value, deps.clock.now()), 200);
    })
    .openapi(archivePetRoute, async (c) => {
      const { userId } = authenticatedUser(c);
      const result = await archivePet(deps, userId as Uuid, c.req.valid("param").id as Uuid);
      if (!result.ok) throw petError(result.error);
      return c.body(null, 204);
    })
    .openapi(getCaretakerRoute, async (c) => {
      const { userId } = authenticatedUser(c);
      return c.json(caretakerBody(await getCaretaker(deps, userId as Uuid)), 200);
    })
    .openapi(updateCaretakerRoute, async (c) => {
      const { userId } = authenticatedUser(c);
      const result = await updateCaretaker(deps, userId as Uuid, c.req.valid("json"));
      if (!result.ok) {
        throw new AppError("validation-failed", {
          errors: [
            {
              path: "firstName",
              message: "Solo tu nombre de pila: letras, espacios, guion o apóstrofo (máx. 40)",
            },
          ],
        });
      }
      return c.json(caretakerBody(result.value), 200);
    });
}
