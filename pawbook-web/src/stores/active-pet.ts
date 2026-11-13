import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MY_PETS } from "@/lib/sample-data";
import type { Pet } from "@/lib/types";

/*
 * Mascota activa (UI-003): firma todo lo que se publica, comenta o reacciona.
 * En la API real viajará en la cabecera X-Pet-Id; aquí se guarda en localStorage.
 */

type ActivePetState = {
  activePetId: string;
  setActivePet: (petId: string) => void;
};

const DEFAULT_PET_ID = MY_PETS[0].id;

export const useActivePetStore = create<ActivePetState>()(
  persist(
    (set) => ({
      activePetId: DEFAULT_PET_ID,
      setActivePet: (petId) => {
        // Solo se puede activar una mascota propia; cualquier otro id se ignora.
        if (MY_PETS.some((pet) => pet.id === petId)) set({ activePetId: petId });
      },
    }),
    {
      name: "pawbook-active-pet",
      storage: createJSONStorage(() => localStorage),
      // El servidor no tiene localStorage: se rehidrata tras montar (ver Providers)
      // para que el primer render del cliente coincida con el HTML del servidor.
      skipHydration: true,
    },
  ),
);

/** Devuelve la mascota activa completa; cae a la primera si el id guardado ya no existe. */
export function useActivePet(): Pet {
  const activePetId = useActivePetStore((state) => state.activePetId);
  return MY_PETS.find((pet) => pet.id === activePetId) ?? MY_PETS[0];
}
