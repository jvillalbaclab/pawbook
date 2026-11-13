import type { Post, ReactionKind } from "@/lib/types";

/**
 * Aplica una reacción de la mascota activa (US-11): una sola por publicación.
 * - Misma reacción que la actual: se retira.
 * - Otra reacción: reemplaza la anterior (resta una a la vieja, suma una a la nueva).
 * Devuelve una publicación nueva; no muta la original (sirve para updates optimistas).
 */
export function applyReaction(post: Post, kind: ReactionKind): Post {
  const reactions = { ...post.reactions };
  const previous = post.myReaction;

  if (previous) reactions[previous] = Math.max(0, reactions[previous] - 1);
  if (previous === kind) return { ...post, reactions, myReaction: null };

  reactions[kind] += 1;
  return { ...post, reactions, myReaction: kind };
}
