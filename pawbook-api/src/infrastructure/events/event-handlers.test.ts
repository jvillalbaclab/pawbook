import { describe, expect, test } from "bun:test";
import type { EventHandler } from "../../shared/events";
import type { Uuid } from "../../shared/ids";
import { assertUniqueQueues, queueName, toDeliveredEvent } from "./event-handlers";

const handler = (eventType: string, name: string): EventHandler => ({
  eventType,
  name,
  handle: async () => {},
});

describe("handlers de eventos", () => {
  test("cada handler tiene su cola <tipo>/<consumidor>", () => {
    expect(queueName(handler("pawmates.match-created", "notifications.match-email"))).toBe(
      "pawmates.match-created/notifications.match-email",
    );
  });

  test("permite varios consumidores del mismo evento pero no dos con el mismo nombre", () => {
    expect(() =>
      assertUniqueQueues([
        handler("pawmates.match-created", "chat.open-channel"),
        handler("pawmates.match-created", "notifications.match-email"),
      ]),
    ).not.toThrow();
    expect(() =>
      assertUniqueQueues([
        handler("pawmates.match-created", "chat.open-channel"),
        handler("pawmates.match-created", "chat.open-channel"),
      ]),
    ).toThrow(/duplicado: pawmates.match-created\/chat.open-channel/);
  });

  test("reconstruye el evento entregado desde el mensaje del job", () => {
    const eventId = "01970000-0000-7000-8000-000000000000" as Uuid;
    expect(
      toDeliveredEvent({
        eventId,
        type: "pets.pet-created",
        occurredAt: "2026-11-17T10:00:00.000Z",
        payload: { petId: "p-1" },
      }),
    ).toEqual({
      id: eventId,
      type: "pets.pet-created",
      occurredAt: new Date("2026-11-17T10:00:00.000Z"),
      payload: { petId: "p-1" },
    });
  });
});
