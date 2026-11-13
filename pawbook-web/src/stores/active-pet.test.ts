import { beforeEach, describe, expect, test } from "bun:test";
import { useActivePetStore } from "./active-pet";

describe("mascota activa", () => {
  beforeEach(() => {
    useActivePetStore.setState({ activePetId: "pet-luna" });
  });

  test("cambia a otra mascota propia", () => {
    useActivePetStore.getState().setActivePet("pet-rocco");
    expect(useActivePetStore.getState().activePetId).toBe("pet-rocco");
  });

  test("ignora una mascota que no es del usuario", () => {
    useActivePetStore.getState().setActivePet("pet-toby");
    expect(useActivePetStore.getState().activePetId).toBe("pet-luna");
  });
});
