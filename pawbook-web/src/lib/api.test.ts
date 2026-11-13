import { describe, expect, test } from "bun:test";
import {
  filterAdoptions,
  getFeed,
  getPet,
  getSuggestedPets,
  listAdoptions,
  reactToPost,
} from "./api";
import { ADOPTIONS } from "./sample-data";

describe("getFeed", () => {
  test("Para ti devuelve todas las publicaciones", async () => {
    const posts = await getFeed("for-you", "pet-luna");
    expect(posts.length).toBeGreaterThan(1);
  });

  test("Siguiendo solo trae a las mascotas seguidas", async () => {
    const posts = await getFeed("following", "pet-luna");
    const handles = new Set(posts.map((post) => post.author.handle));
    expect([...handles].sort()).toEqual(["mishi.naranja", "toby.mestizo"]);
  });

  test("Siguiendo queda vacío si la mascota no sigue a nadie", async () => {
    expect(await getFeed("following", "pet-rocco")).toEqual([]);
  });

  test("devuelve copias: mutar el resultado no altera los datos", async () => {
    const [first] = await getFeed("for-you", "pet-luna");
    first.text = "modificado";
    const [again] = await getFeed("for-you", "pet-luna");
    expect(again.text).not.toBe("modificado");
  });
});

describe("reactToPost", () => {
  test("persiste la reacción entre lecturas", async () => {
    await reactToPost("post-2", "bone");
    const posts = await getFeed("for-you", "pet-luna");
    expect(posts.find((post) => post.id === "post-2")?.myReaction).toBe("bone");
  });

  test("rechaza una publicación inexistente", async () => {
    await expect(reactToPost("no-existe", "paw")).rejects.toThrow();
  });
});

describe("getPet", () => {
  test("encuentra una mascota por handle", async () => {
    expect((await getPet("toby.mestizo"))?.name).toBe("Toby");
  });

  test("devuelve null para un handle desconocido", async () => {
    expect(await getPet("nadie")).toBeNull();
  });
});

describe("getSuggestedPets", () => {
  test("excluye mascotas propias y ya seguidas", async () => {
    const handles = (await getSuggestedPets("pet-luna")).map((pet) => pet.handle);
    expect(handles).toEqual(["nala.persa", "oliver.miau", "kiwi.gatito"]);
  });
});

describe("adopciones", () => {
  test("filtra por especie", () => {
    const cats = filterAdoptions(ADOPTIONS, { species: "cat" });
    expect(cats.length).toBeGreaterThan(0);
    expect(cats.every((listing) => listing.species === "cat")).toBe(true);
  });

  test("filtra solo urgentes", async () => {
    const urgent = await listAdoptions({ urgentOnly: true });
    expect(urgent.map((listing) => listing.id).sort()).toEqual(["canela", "tomas"]);
  });

  test("sin filtro devuelve todo", () => {
    expect(filterAdoptions(ADOPTIONS, {})).toHaveLength(ADOPTIONS.length);
  });
});
