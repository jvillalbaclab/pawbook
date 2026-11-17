import { z } from "@hono/zod-openapi";

/*
 * Tokens de GetStream (FR-AUTH-010, ADR-002, arquitectura §5.3). Feeds se conecta como la mascota
 * activa (`pet_<petId>`) y Chat como la persona (`usr_<userId>`).
 */
export const StreamTokenResponseSchema = z
  .object({
    apiKey: z.string().openapi({ description: "API key pública de la app de Stream." }),
    feedsUserId: z.string().openapi({ example: "pet_0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e61" }),
    feedsToken: z.string().openapi({ description: "Token de Feeds de la mascota activa." }),
    chatUserId: z.string().openapi({ example: "usr_0192f5e4-7c1a-7b3e-9a40-5d1f0c2b8e61" }),
    chatToken: z.string().nullable().openapi({
      description:
        "Token de Chat del usuario. `null` si su correo no está verificado: no puede chatear (FR-AUTH-006).",
    }),
    expiresAt: z.iso.datetime().openapi({
      description: "Caducidad de ambos tokens (≤ 24 h). El cliente pide otros antes.",
    }),
  })
  .openapi("StreamTokens");

export type StreamTokenResponse = z.infer<typeof StreamTokenResponseSchema>;
