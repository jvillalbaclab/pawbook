/** Límite de texto de una publicación (US-10). */
export const MAX_POST_LENGTH = 2200;

export type PostTextError = "too-long";

/** Devuelve el código de error (la interfaz lo traduce), o null si el texto es válido. */
export function validatePostText(text: string): PostTextError | null {
  return text.length > MAX_POST_LENGTH ? "too-long" : null;
}
