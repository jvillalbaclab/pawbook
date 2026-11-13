import type { ChatMessage } from "@/lib/types";

/** Longitud máxima de un mensaje de chat. */
export const MAX_MESSAGE_LENGTH = 1000;

/**
 * Añade un mensaje propio al hilo. Ignora texto vacío o solo espacios y recorta el
 * texto sobrante. Devuelve el mismo array si no hay nada que enviar.
 */
export function appendMessage(
  messages: ChatMessage[],
  rawText: string,
  id: string,
  timeLabel: string,
): ChatMessage[] {
  const text = rawText.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!text) return messages;
  return [...messages, { id, fromMe: true, text, timeLabel, status: "sent" }];
}
