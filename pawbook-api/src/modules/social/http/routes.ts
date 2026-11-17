import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  ActivePetHeadersSchema,
  ProblemSchema,
  StreamTokenResponseSchema,
} from "@pawbook/contracts";
import { type ActivePetMiddleware, activePetOf } from "../../../http/middleware/active-pet";
import { authenticatedUser, requireAuth } from "../../../http/middleware/auth";
import type { AppEnv } from "../../../http/types";
import { AppError } from "../../../shared/errors";
import type { SocialDeps } from "../application/ports";
import { issueStreamTokens } from "../application/stream-tokens";

/*
 * Rutas de social bajo /v1. Hoy solo `POST /stream/token` (FR-AUTH-010, arquitectura §5.3); las
 * publicaciones, reacciones y follows (§4.5) llegarán en M1 y usarán el mismo `activePet`.
 */

export type SocialRoutesOptions = {
  readonly social: SocialDeps;
  /** Middleware `activePet` ya conectado con el módulo pets (lo crea la composición). */
  readonly activePet: ActivePetMiddleware;
};

const problem = (description: string) => ({
  description,
  content: { "application/problem+json": { schema: ProblemSchema } },
});

export function socialRoutes(options: SocialRoutesOptions) {
  const deps = options.social;

  const streamTokenRoute = createRoute({
    method: "post",
    path: "/stream/token",
    tags: ["Tiempo real"],
    summary: "Tokens de GetStream para la mascota activa y el usuario",
    description:
      "FR-AUTH-010 y ADR-002: token de Feeds para `pet_<X-Pet-Id>` y de Chat para `usr_<userId>`, válidos 1 h. Al cambiar de mascota activa, el cliente pide otro (solo cambia el de Feeds). Sin correo verificado, `chatToken` es `null` (FR-AUTH-006).",
    middleware: [requireAuth, options.activePet],
    security: [{ bearerAuth: [] }],
    request: { headers: ActivePetHeadersSchema },
    responses: {
      200: {
        description: "Tokens emitidos",
        content: { "application/json": { schema: StreamTokenResponseSchema } },
      },
      400: problem("Falta `X-Pet-Id` o no es un ID válido"),
      401: { $ref: "#/components/responses/Unauthorized" },
      403: problem("La mascota no existe, está archivada o no es tuya"),
      429: { $ref: "#/components/responses/TooManyRequests" },
      503: problem("GetStream no está configurado en este entorno"),
    },
  });

  return new OpenAPIHono<AppEnv>().openapi(streamTokenRoute, async (c) => {
    const { userId, emailVerified } = authenticatedUser(c);
    const result = issueStreamTokens(deps, { userId, petId: activePetOf(c), emailVerified });
    if (!result.ok) {
      throw new AppError("service-unavailable", {
        detail: "El tiempo real no está disponible en este entorno.",
      });
    }
    const tokens = result.value;
    c.header("Cache-Control", "no-store");
    return c.json({ ...tokens, expiresAt: tokens.expiresAt.toISOString() }, 200);
  });
}
