import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { AppError } from "../../shared/errors";
import type { AppEnv } from "../types";
import { authenticatedUser } from "./auth";

/*
 * Mascota activa (arquitectura §4.4, FR-PET-005). Toda acción social se hace en nombre de la
 * mascota de la cabecera `X-Pet-Id`, y el servidor comprueba en cada solicitud que pertenece al
 * usuario autenticado y no está archivada. Como con `AccessTokenVerifier`, este middleware no
 * conoce el módulo pets: recibe un verificador que la composición conecta (con la caché de
 * propiedad de 60 s en Valkey). Así web y móvil funcionan igual, sin estado de sesión.
 *
 * Uso en un módulo social (la composición le pasa la instancia):
 *
 *   app.openapi({ ...createPostRoute, middleware: [requireVerifiedEmail, activePet] }, (c) => {
 *     const petId = c.var.activePetId; // ya validada
 *   })
 */

export const ACTIVE_PET_HEADER = "X-Pet-Id";

export interface ActivePetVerifier {
  /** `true` solo si la mascota existe, no está archivada y la gestiona `userId`. */
  canActAs(userId: string, petId: string): Promise<boolean>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Exige sesión y una `X-Pet-Id` válida del usuario; deja la mascota en `c.var.activePetId`.
 * 400 si falta o está mal formada; 403 si no existe, está archivada o es de otro, con la misma
 * respuesta en los tres casos para no revelar a quién pertenece cada mascota.
 */
export function createActivePetMiddleware(verifier: ActivePetVerifier) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const { userId } = authenticatedUser(c);
    const petId = c.req.header(ACTIVE_PET_HEADER)?.trim();
    if (petId === undefined || petId === "") {
      throw new AppError("bad-request", {
        detail: `Falta la cabecera ${ACTIVE_PET_HEADER} con la mascota activa.`,
      });
    }
    if (!UUID_PATTERN.test(petId)) {
      throw new AppError("bad-request", {
        detail: `La cabecera ${ACTIVE_PET_HEADER} no es un identificador válido.`,
      });
    }
    const normalized = petId.toLowerCase();
    if (!(await verifier.canActAs(userId, normalized))) {
      throw new AppError("forbidden", {
        detail: "No puedes actuar como esta mascota. Elige una de tus mascotas activas.",
      });
    }
    c.set("activePetId", normalized);
    await next();
  });
}

export type ActivePetMiddleware = ReturnType<typeof createActivePetMiddleware>;

/** Mascota activa ya verificada. Para rutas montadas detrás del middleware `activePet`. */
export function activePetOf(c: Context<AppEnv>): string {
  const petId = c.get("activePetId");
  if (petId === undefined) {
    // Error de programación: la ruta no montó el middleware.
    throw new Error("La ruta usa la mascota activa sin el middleware activePet");
  }
  return petId;
}
