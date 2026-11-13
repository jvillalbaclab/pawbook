/**
 * Tonos pastel de avatares y fotos de ejemplo. Son iguales en claro y oscuro:
 * el texto oscuro sobre pastel cumple contraste en ambos temas.
 */
export const TONES = {
  lilac: { bg: "#e5deff", fg: "#3f2e8c" },
  peach: { bg: "#fde3d8", fg: "#9a3412" },
  mint: { bg: "#d7efe4", fg: "#065f46" },
  sand: { bg: "#e9dcc9", fg: "#78350f" },
  apricot: { bg: "#f4d9b8", fg: "#78350f" },
  sky: { bg: "#dce7f3", fg: "#1e3a5f" },
  butter: { bg: "#fde68a", fg: "#78350f" },
  violet: { bg: "#ede9fe", fg: "#4c1d95" },
} as const;

export type Tone = keyof typeof TONES;
