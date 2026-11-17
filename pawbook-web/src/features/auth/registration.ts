/** Meta del PRD: seguir al menos 5 mascotas para llenar el feed (objetivo "Red"). */
export const FOLLOW_TARGET = 5;

/** Convierte un nombre en un @handle sugerido: minúsculas, sin tildes ni espacios. */
export function suggestHandle(name: string, species: "dog" | "cat"): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  if (!base) return "";
  return `${base}.${species === "cat" ? "gato" : "perro"}`;
}
