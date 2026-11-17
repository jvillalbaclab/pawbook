import type { Pet } from "@pawbook/contracts";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { TONES, type Tone } from "@/design-system/tones";

/*
 * Mascota activa (UI-003, FR-PET-005): firma todo lo que se publica, comenta o reacciona y
 * viaja en `X-Pet-Id` (ver @/lib/api-client/active-pet-header).
 *
 * - Las mascotas llegan de `GET /v1/me/pets` (ActivePetSync las vuelca aquí tras recuperar la
 *   sesión). El store guarda esa lista para validar la elección sin depender de React.
 * - La elección se recuerda por usuario en localStorage: solo el ID de la mascota, nunca
 *   tokens. Si la guardada ya no está (archivada o de otra cuenta), se cae a la primera.
 * - Al cerrar sesión el store se vacía; la preferencia guardada se conserva para la próxima
 *   vez que entre ese mismo usuario.
 */

/** Dónde se recuerda la mascota elegida por cada usuario. */
export type ActivePetPreference = {
  read: (userId: string) => string | null;
  write: (userId: string, petId: string) => void;
};

const PREFERENCE_PREFIX = "pawbook-active-pet:";

/** Preferencia en localStorage. Cualquier fallo (modo privado, cuota) se ignora. */
export const localPreference: ActivePetPreference = {
  read(userId) {
    try {
      return globalThis.localStorage?.getItem(PREFERENCE_PREFIX + userId) ?? null;
    } catch {
      return null;
    }
  },
  write(userId, petId) {
    try {
      globalThis.localStorage?.setItem(PREFERENCE_PREFIX + userId, petId);
    } catch {
      // Sin almacenamiento, la elección dura lo que dure la pestaña.
    }
  },
};

export type ActivePetState = {
  /** `idle`: aún no se sabe qué mascotas tiene el usuario. `ready`: lista cargada. */
  status: "idle" | "ready";
  userId: string | null;
  /** Mascotas activas del usuario, de la más antigua a la más reciente. */
  pets: readonly Pet[];
  activePetId: string | null;
  /** Vuelca la lista de la API y resuelve cuál es la activa. */
  hydrate: (userId: string, pets: readonly Pet[]) => void;
  /** Cambia la mascota activa. Un ID que no es del usuario se ignora. */
  select: (petId: string) => void;
  /** Añade una mascota recién creada y la deja como activa. */
  add: (userId: string, pet: Pet) => void;
  /** Cierre de sesión: olvida mascotas y elección (no la preferencia guardada). */
  reset: () => void;
};

const EMPTY = { status: "idle", userId: null, pets: [], activePetId: null } as const;

export function createActivePetStore(preference: ActivePetPreference = localPreference) {
  return createStore<ActivePetState>()((set, get) => ({
    ...EMPTY,

    hydrate(userId, pets) {
      const state = get();
      // Dentro de la misma sesión manda la elección en memoria; si no, la guardada.
      const preferred =
        (state.userId === userId ? state.activePetId : null) ?? preference.read(userId);
      const activePetId = pets.some((pet) => pet.id === preferred)
        ? preferred
        : (pets[0]?.id ?? null);
      if (activePetId !== null && activePetId !== preferred) preference.write(userId, activePetId);
      set({ status: "ready", userId, pets, activePetId });
    },

    select(petId) {
      const { userId, pets, activePetId } = get();
      if (userId === null || petId === activePetId) return;
      if (!pets.some((pet) => pet.id === petId)) return;
      preference.write(userId, petId);
      set({ activePetId: petId });
    },

    add(userId, pet) {
      const state = get();
      const pets = state.userId === userId ? state.pets.filter((mine) => mine.id !== pet.id) : [];
      preference.write(userId, pet.id);
      set({ status: "ready", userId, pets: [...pets, pet], activePetId: pet.id });
    },

    reset() {
      set(EMPTY);
    },
  }));
}

export type ActivePetStore = ReturnType<typeof createActivePetStore>;

/** Store de la pestaña. Fuera de React (cliente de la API, tiempo real) se usa tal cual. */
export const activePetStore = createActivePetStore();

export function useActivePetStore<T>(selector: (state: ActivePetState) => T): T {
  return useStore(activePetStore, selector);
}

// ------------------------------------------------------------------- vista para la UI

/** Lo que pintan las pantallas de la mascota activa (avatar, nombre, @handle). */
export type ActivePetView = {
  id: string;
  name: string;
  handle: string;
  species: Pet["species"];
  tone: Tone;
};

const TONE_NAMES = Object.keys(TONES) as Tone[];

/** Tono estable por mascota mientras no haya avatar (media llega en M1). */
export function toneFor(petId: string): Tone {
  let hash = 0;
  for (const char of petId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONE_NAMES[hash % TONE_NAMES.length];
}

export function toPetView(pet: Pet): ActivePetView {
  return {
    id: pet.id,
    name: pet.name,
    handle: pet.handle,
    species: pet.species,
    tone: toneFor(pet.id),
  };
}

function selectActivePet(state: ActivePetState): Pet | null {
  return state.pets.find((pet) => pet.id === state.activePetId) ?? null;
}

/** Mascota activa, o `null` si aún no se conoce o el usuario no tiene ninguna. */
export function useActivePet(): ActivePetView | null {
  const pet = useActivePetStore(selectActivePet);
  return pet === null ? null : toPetView(pet);
}

/**
 * Mascota activa en las pantallas privadas. Solo se usa bajo `ActivePetGate`, que no pinta
 * su contenido hasta que hay una mascota activa.
 */
export function useRequiredActivePet(): ActivePetView {
  const pet = useActivePet();
  if (pet === null) throw new Error("useRequiredActivePet fuera de ActivePetGate");
  return pet;
}
