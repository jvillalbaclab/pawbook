import { api, unwrap } from "@/lib/api-client/client";
import { createStreamSession, type StreamTokens } from "./stream-session";

/**
 * `POST /v1/stream/token` para una mascota concreta. La `X-Pet-Id` va explícita (no la del
 * store en el momento de enviar): así los tokens corresponden siempre a la mascota pedida.
 */
export function requestStreamTokens(petId: string, signal: AbortSignal): Promise<StreamTokens> {
  return unwrap(
    api.POST("/v1/stream/token", { params: { header: { "x-pet-id": petId } }, signal }),
  );
}

/** Sesión de tiempo real de la pestaña; ActivePetSync le dice qué mascota está activa. */
export const streamSession = createStreamSession({ requestTokens: requestStreamTokens });
