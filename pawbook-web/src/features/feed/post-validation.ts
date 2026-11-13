/** Límite de texto de una publicación (US-10). */
export const MAX_POST_LENGTH = 2200;

/** Devuelve el mensaje de error para el usuario, o null si el texto es válido. */
export function validatePostText(text: string): string | null {
  if (text.length > MAX_POST_LENGTH) {
    return `El texto supera los ${MAX_POST_LENGTH.toLocaleString("es")} caracteres.`;
  }
  return null;
}
