import { describe, expect, test } from "bun:test";
import { fixedClock } from "./clock";
import { type DomainEvent, domainEvent } from "./events";

type MatchCreated = DomainEvent<"pawmates.match-created", { matchId: string; petIds: string[] }>;

describe("domainEvent", () => {
  test("crea el evento con la fecha del reloj inyectado y el payload tipado", () => {
    const clock = fixedClock(new Date("2026-11-17T10:00:00.000Z"));
    const event: MatchCreated = domainEvent(
      "pawmates.match-created",
      { matchId: "m-1", petIds: ["a", "b"] },
      clock,
    );

    expect(event).toEqual({
      type: "pawmates.match-created",
      occurredAt: new Date("2026-11-17T10:00:00.000Z"),
      payload: { matchId: "m-1", petIds: ["a", "b"] },
    });
  });

  test("el payload sobrevive a un viaje por JSON", () => {
    const event = domainEvent("pets.pet-created", { petId: "p-1", tags: ["perro"], age: 3 });
    expect(JSON.parse(JSON.stringify(event.payload))).toEqual(event.payload);
  });

  test.each(["PetCreated", "pets", "pets.Pet created", "pets/pet-created", ".pet-created"])(
    "rechaza el tipo mal formado %p",
    (type) => {
      expect(() => domainEvent(type, {})).toThrow(/Tipo de evento inválido/);
    },
  );
});
