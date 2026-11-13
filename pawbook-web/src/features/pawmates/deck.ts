import type { PawMateCandidate } from "@/lib/types";

export type DeckState = {
  index: number;
  /** Último match conseguido, para mostrar el aviso; null si no hay. */
  match: PawMateCandidate | null;
};

export type DeckChoice = "pass" | "interested";

export const INITIAL_DECK: DeckState = { index: 0, match: null };

/**
 * Avanza el mazo de candidatos (US-31/32). Hay match solo si marcamos interés y la
 * otra mascota ya lo había marcado. Al final del mazo el índice deja de avanzar.
 */
export function decide(
  state: DeckState,
  candidates: PawMateCandidate[],
  choice: DeckChoice,
): DeckState {
  const current = candidates[state.index];
  if (!current) return state;
  const match = choice === "interested" && current.likesYou ? current : null;
  return { index: state.index + 1, match };
}
