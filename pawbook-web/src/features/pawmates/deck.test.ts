import { describe, expect, test } from "bun:test";
import { CANDIDATES } from "@/lib/sample-data";
import { decide, INITIAL_DECK } from "./deck";

const likesYou = CANDIDATES.find((candidate) => candidate.likesYou);
const notYet = CANDIDATES.find((candidate) => !candidate.likesYou);

describe("decide", () => {
  test("hay match si hay interés mutuo", () => {
    if (!likesYou) throw new Error("los datos de ejemplo necesitan un candidato con interés");
    const result = decide(INITIAL_DECK, [likesYou], "interested");
    expect(result.match?.pet.id).toBe(likesYou.pet.id);
    expect(result.index).toBe(1);
  });

  test("sin interés de la otra parte no hay match", () => {
    if (!notYet) throw new Error("los datos de ejemplo necesitan un candidato sin interés");
    expect(decide(INITIAL_DECK, [notYet], "interested").match).toBeNull();
  });

  test("pasar nunca genera match, aunque la otra parte tenga interés", () => {
    if (!likesYou) throw new Error("falta candidato");
    expect(decide(INITIAL_DECK, [likesYou], "pass").match).toBeNull();
  });

  test("al final del mazo el estado no cambia", () => {
    const end = { index: CANDIDATES.length, match: null };
    expect(decide(end, CANDIDATES, "interested")).toBe(end);
  });
});
