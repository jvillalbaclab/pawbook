import { describe, expect, test } from "bun:test";
import type { ChatMessage } from "@/lib/types";
import { appendMessage, MAX_MESSAGE_LENGTH } from "./messages";

const thread: ChatMessage[] = [{ id: "m1", fromMe: false, text: "Hola", timeLabel: "10:00" }];

describe("appendMessage", () => {
  test("añade un mensaje propio enviado", () => {
    const result = appendMessage(thread, "¿Parque a las 7?", "m2", "10:01");
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      id: "m2",
      fromMe: true,
      text: "¿Parque a las 7?",
      timeLabel: "10:01",
      status: "sent",
    });
  });

  test("recorta espacios alrededor", () => {
    expect(appendMessage(thread, "  hola  ", "m2", "10:01")[1].text).toBe("hola");
  });

  test("ignora texto vacío o solo espacios", () => {
    expect(appendMessage(thread, "   ", "m2", "10:01")).toBe(thread);
  });

  test("corta el texto al máximo permitido", () => {
    const long = "a".repeat(MAX_MESSAGE_LENGTH + 50);
    expect(appendMessage(thread, long, "m2", "10:01")[1].text).toHaveLength(MAX_MESSAGE_LENGTH);
  });

  test("no muta el hilo original", () => {
    appendMessage(thread, "hola", "m2", "10:01");
    expect(thread).toHaveLength(1);
  });
});
