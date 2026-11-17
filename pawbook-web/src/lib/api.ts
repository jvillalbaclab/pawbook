import { applyReaction } from "@/features/feed/reactions";
import {
  ADOPTIONS,
  ALL_PETS,
  CANDIDATES,
  CONVERSATIONS,
  MY_PETS,
  OTHER_PETS,
  POSTS,
} from "./sample-data";
import type {
  AdoptionFilter,
  AdoptionListing,
  Conversation,
  FeedTab,
  PawMateCandidate,
  Pet,
  Post,
  ReactionKind,
} from "./types";

/*
 * Cliente de datos del prototipo. Imita al futuro cliente de /v1: funciones asíncronas
 * que devuelven copias. Las pantallas solo hablan con este módulo (es el único que
 * importa `sample-data.ts`, que es TEMPORAL), así que conectar la API real es cambiar
 * el interior de estas funciones, no los componentes.
 */

const IS_BROWSER = typeof window !== "undefined";
const LATENCY_MS = process.env.NODE_ENV === "test" ? 0 : 150;

/**
 * Devuelve una copia de los datos. La latencia simulada solo se aplica en el navegador,
 * para ver los estados de carga. En servidor se responde al momento: con Cache Components
 * un temporizador cuenta como dato sin caché y bloquearía el prerenderizado.
 * Al conectar /v1, las lecturas de servidor llevarán "use cache" o irán dentro de <Suspense>.
 */
function respond<T>(value: T): Promise<T> {
  const copy = structuredClone(value);
  if (!IS_BROWSER || LATENCY_MS === 0) return Promise.resolve(copy);
  return new Promise((resolve) => setTimeout(() => resolve(copy), LATENCY_MS));
}

// Estado mutable del "servidor" de ejemplo: así una reacción sobrevive a la navegación.
const posts: Post[] = structuredClone(POSTS);

/** A quién sigue cada mascota propia. Rocco no sigue a nadie: muestra el estado vacío. */
const FOLLOWING: Record<string, string[]> = {
  "pet-luna": ["toby.mestizo", "mishi.naranja"],
  "pet-rocco": [],
};

/**
 * Seguimientos de ejemplo para las mascotas reales (las de `GET /v1/me/pets`), que aún no
 * siguen a nadie en /v1: así la pestaña "Siguiendo" del prototipo sigue teniendo contenido.
 */
const DEFAULT_FOLLOWING = FOLLOWING["pet-luna"];

function followedBy(activePetId: string): string[] {
  return FOLLOWING[activePetId] ?? DEFAULT_FOLLOWING;
}

/** Mascotas propias del ejemplo; solo las usa el perfil público de ejemplo (`isMine`). */
export function getMyPets(): Promise<Pet[]> {
  return respond(MY_PETS);
}

/** Handles públicos conocidos, para prerenderizar perfiles. */
export function listPetHandles(): Promise<string[]> {
  return respond(ALL_PETS.map((pet) => pet.handle));
}

/** Sugerencias del paso 3 del registro (por especie y cercanía cuando exista /v1). */
export function getOnboardingSuggestions(): Promise<Pet[]> {
  return respond(OTHER_PETS);
}

export function getFeed(tab: FeedTab, activePetId: string): Promise<Post[]> {
  if (tab === "for-you") return respond(posts);
  const followed = followedBy(activePetId);
  return respond(posts.filter((post) => followed.includes(post.author.handle)));
}

export function reactToPost(postId: string, kind: ReactionKind): Promise<Post> {
  const index = posts.findIndex((post) => post.id === postId);
  if (index === -1) return Promise.reject(new Error("La publicación ya no existe."));
  posts[index] = applyReaction(posts[index], kind);
  return respond(posts[index]);
}

export function toggleSave(postId: string): Promise<Post> {
  const post = posts.find((item) => item.id === postId);
  if (!post) return Promise.reject(new Error("La publicación ya no existe."));
  post.saved = !post.saved;
  return respond(post);
}

export function getPet(handle: string): Promise<Pet | null> {
  return respond(ALL_PETS.find((pet) => pet.handle === handle) ?? null);
}

export function getPostsByPet(handle: string): Promise<Post[]> {
  return respond(posts.filter((post) => post.author.handle === handle));
}

/** Sugerencias para seguir: mascotas ajenas que la mascota activa aún no sigue. */
export function getSuggestedPets(activePetId: string): Promise<Pet[]> {
  const followed = followedBy(activePetId);
  const mine = new Set(MY_PETS.map((pet) => pet.id));
  return respond(ALL_PETS.filter((pet) => !mine.has(pet.id) && !followed.includes(pet.handle)));
}

export function getCandidates(): Promise<PawMateCandidate[]> {
  return respond(CANDIDATES);
}

export function getConversations(): Promise<Conversation[]> {
  return respond(CONVERSATIONS);
}

export function getConversation(id: string): Promise<Conversation | null> {
  return respond(CONVERSATIONS.find((conversation) => conversation.id === id) ?? null);
}

/** Filtro puro de adopciones; exportado para probarlo y reutilizarlo en cliente. */
export function filterAdoptions(
  listings: AdoptionListing[],
  filter: AdoptionFilter,
): AdoptionListing[] {
  return listings.filter(
    (listing) =>
      (!filter.species || listing.species === filter.species) &&
      (!filter.urgentOnly || listing.urgent),
  );
}

export function listAdoptions(filter: AdoptionFilter = {}): Promise<AdoptionListing[]> {
  return respond(filterAdoptions(ADOPTIONS, filter));
}

export function getAdoption(id: string): Promise<AdoptionListing | null> {
  return respond(ADOPTIONS.find((listing) => listing.id === id) ?? null);
}
