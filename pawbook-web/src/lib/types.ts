import type { Tone } from "@/design-system/tones";

/*
 * Tipos con la forma que tendrá el contrato de la API (/v1). Cuando exista
 * @pawbook/contracts, estos tipos se sustituyen por los suyos.
 */

export type Species = "dog" | "cat";
export type Sex = "female" | "male";

export type Pet = {
  id: string;
  handle: string;
  name: string;
  species: Species;
  breed: string;
  ageLabel: string;
  sex: Sex;
  bio: string;
  tone: Tone;
  ownerName: string;
  stats: { posts: number; followers: number; following: number };
};

export type ReactionKind = "paw" | "heart" | "bone" | "fish";
export type ReactionCounts = Record<ReactionKind, number>;

export type Comment = {
  id: string;
  author: Pick<Pet, "name" | "handle" | "tone">;
  text: string;
  timeLabel: string;
};

export type Post = {
  id: string;
  author: Pick<Pet, "name" | "handle" | "tone" | "breed" | "species">;
  timeLabel: string;
  location?: string;
  mood?: string;
  text: string;
  photo: { tone: Tone; alt: string; count: number };
  reactions: ReactionCounts;
  /** Reacción de la mascota activa; una por mascota y publicación (US-11). */
  myReaction: ReactionKind | null;
  commentCount: number;
  saved: boolean;
  comments: Comment[];
};

export type FeedTab = "for-you" | "following";

export type Energy = "low" | "medium" | "high";
export type Size = "small" | "medium" | "large";

export type PawMateCandidate = {
  pet: Pick<Pet, "id" | "name" | "handle" | "tone" | "breed" | "ageLabel">;
  distanceKm: number;
  energy: Energy;
  size: Size;
  tags: string[];
  highlyCompatible: boolean;
  /** Si ya marcó interés en nuestra mascota: al aceptar hay match. */
  likesYou: boolean;
};

export type MessageStatus = "sent" | "delivered" | "read";

export type ChatMessage = {
  id: string;
  fromMe: boolean;
  text: string;
  photo?: { tone: Tone; alt: string };
  timeLabel: string;
  status?: MessageStatus;
};

export type Conversation = {
  id: string;
  kind: "pawmates" | "adoption";
  pet: Pick<Pet, "name" | "handle" | "tone" | "breed">;
  myPetName: string;
  distanceLabel?: string;
  online: boolean;
  typing: boolean;
  unread: boolean;
  lastMessage: string;
  timeLabel: string;
  messages: ChatMessage[];
};

export type AdoptionStatus = "available" | "in-process" | "adopted";

export type Organization = { id: string; name: string; verified: boolean };

export type AdoptionListing = {
  id: string;
  name: string;
  species: Species;
  sex: Sex;
  ageLabel: string;
  sizeLabel?: string;
  urgent: boolean;
  status: AdoptionStatus;
  health: string;
  temperament: string;
  story: string;
  tone: Tone;
  organization: Organization;
};

export type AdoptionFilter = { species?: Species; urgentOnly?: boolean };
