import { describe, expect, test } from "bun:test";
import type { ChatMessage } from "@/lib/types";
import { appendMessage, MAX_MESSAGE_LENGTH } from "./messages";

const AT = "2026-03-12T10:01:00.000Z";
const thread: ChatMessage[] = [
  { id: "m1", fromMe: false, text: "Hola", sentAt: "2026-03-12T10:00:00.000Z" },
];

describe("appendMessage", () => {
  test("añade un mensaje propio enviado", () => {
    const result = appendMessage(thread, "¿Parque a las 7?", "m2", AT);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      id: "m2",
      fromMe: true,
      text: "¿Parque a las 7?",
      sentAt: AT,
      status: "sent",
    });
  });

  test("recorta espacios alrededor", () => {
    expect(appendMessage(thread, "  hola  ", "m2", AT)[1].text).toBe("hola");
  });

  test("ignora texto vacío o solo espacios", () => {
    expect(appendMessage(thread, "   ", "m2", AT)).toBe(thread);
  });

  test("corta el texto al máximo permitido", () => {
    const long = "a".repeat(MAX_MESSAGE_LENGTH + 50);
    expect(appendMessage(thread, long, "m2", AT)[1].text).toHaveLength(MAX_MESSAGE_LENGTH);
  });

  test("no muta el hilo original", () => {
    appendMessage(thread, "hola", "m2", AT);
    expect(thread).toHaveLength(1);
  });
});
