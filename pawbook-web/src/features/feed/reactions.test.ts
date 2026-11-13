import { describe, expect, test } from "bun:test";
import { POSTS } from "@/lib/sample-data";
import type { Post } from "@/lib/types";
import { applyReaction } from "./reactions";

function post(overrides: Partial<Post> = {}): Post {
  return {
    ...structuredClone(POSTS[0]),
    reactions: { paw: 10, heart: 5, bone: 0, fish: 1 },
    myReaction: null,
    ...overrides,
  };
}

describe("applyReaction", () => {
  test("añade una reacción cuando no había ninguna", () => {
    const result = applyReaction(post(), "heart");
    expect(result.myReaction).toBe("heart");
    expect(result.reactions.heart).toBe(6);
  });

  test("reemplaza la reacción anterior en vez de sumar dos", () => {
    const result = applyReaction(post({ myReaction: "paw" }), "fish");
    expect(result.myReaction).toBe("fish");
    expect(result.reactions.paw).toBe(9);
    expect(result.reactions.fish).toBe(2);
  });

  test("retira la reacción si se repite la misma", () => {
    const result = applyReaction(post({ myReaction: "paw" }), "paw");
    expect(result.myReaction).toBeNull();
    expect(result.reactions.paw).toBe(9);
  });

  test("nunca deja un contador negativo", () => {
    const result = applyReaction(post({ myReaction: "bone" }), "bone");
    expect(result.reactions.bone).toBe(0);
  });

  test("no muta la publicación original", () => {
    const original = post();
    applyReaction(original, "heart");
    expect(original.reactions.heart).toBe(5);
    expect(original.myReaction).toBeNull();
  });
});
