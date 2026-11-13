"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { CloseIcon, PawIcon, PinIcon } from "@/design-system/icons";
import { Photo } from "@/design-system/photo";
import { EmptyState } from "@/design-system/states";
import { getCandidates } from "@/lib/api";
import { useActivePet } from "@/stores/active-pet";
import { decide, INITIAL_DECK } from "./deck";

const ENERGY_LABEL = { low: "Energía baja", medium: "Energía media", high: "Energía alta" };
const SIZE_LABEL = { small: "Pequeño", medium: "Mediano", large: "Grande" };

export function PawMatesView() {
  const activePet = useActivePet();
  const candidates = useQuery({ queryKey: ["candidates"], queryFn: getCandidates });
  const [deck, setDeck] = useState(INITIAL_DECK);

  if (candidates.isPending) {
    return (
      <div aria-busy="true" className="mx-auto h-[520px] max-w-md rounded-[26px] bg-surface-2" />
    );
  }
  if (candidates.isError) {
    return (
      <EmptyState
        tone="neutral"
        icon={<PawIcon size={44} />}
        title="No pudimos cargar PawMates"
        description="Inténtalo de nuevo en un momento."
      />
    );
  }

  const current = candidates.data[deck.index];
  const choose = (choice: "pass" | "interested") =>
    setDeck((state) => decide(state, candidates.data, choice));

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      {deck.match && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-[18px] border border-primary-line bg-primary-tint p-3.5"
        >
          <PawIcon size={24} className="text-brand" />
          <p className="flex-1 text-sm text-ink">
            <strong>
              {activePet.name} y {deck.match.pet.name} hicieron match.
            </strong>{" "}
            Ya podéis chatear.
          </p>
          <Link href="/mensajes" className="text-sm font-bold text-primary-ink">
            Escribir
          </Link>
        </div>
      )}

      {current ? (
        <>
          <article className="overflow-hidden rounded-[26px] border border-line bg-surface">
            <Photo
              tone={current.pet.tone}
              alt={`Foto de ${current.pet.name}, ${current.pet.breed}`}
              className="h-[330px]"
            >
              {current.highlyCompatible && (
                <span className="absolute top-3.5 left-3.5 rounded-[14px] bg-success px-3 py-1.5 text-xs font-bold text-white">
                  Muy compatible
                </span>
              )}
              <span className="absolute top-3.5 right-3.5 rounded-[14px] bg-white px-3 py-1.5 text-xs font-bold text-stone-900">
                ≈ {current.distanceKm} km
              </span>
            </Photo>
            <div className="flex flex-col gap-2.5 p-4">
              <div className="flex items-baseline gap-2">
                <h2 className="font-display text-[22px] font-extrabold text-ink">
                  {current.pet.name}
                </h2>
                <span className="text-[15px] text-muted">
                  {current.pet.ageLabel} · {current.pet.breed}
                </span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                <li className="rounded-[10px] bg-success-tint px-2.5 py-1 text-xs font-bold text-success-ink">
                  {ENERGY_LABEL[current.energy]}
                </li>
                <li className="rounded-[10px] bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-2">
                  {SIZE_LABEL[current.size]}
                </li>
                {current.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-[10px] bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-2"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </article>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              aria-label={`Pasar de ${current.pet.name}`}
              onClick={() => choose("pass")}
              className="flex size-[60px] items-center justify-center rounded-full border border-line bg-surface text-ink-2 shadow-sm hover:bg-surface-2"
            >
              <CloseIcon size={24} />
            </button>
            <button
              type="button"
              onClick={() => choose("interested")}
              className="flex h-[60px] items-center gap-2 rounded-full bg-primary px-7 text-base font-bold text-white shadow-lg shadow-primary/30 hover:bg-primary-hover"
            >
              <PawIcon size={22} />
              Me interesa
            </button>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<PinIcon size={44} />}
          title="Has visto a todas las mascotas cerca"
          description="Vuelve más tarde o amplía el radio de búsqueda para descubrir más compañeros."
          action={
            <button
              type="button"
              onClick={() => setDeck(INITIAL_DECK)}
              className="mt-2 h-12 rounded-2xl bg-inverse px-6 text-[15px] font-bold text-on-inverse"
            >
              Ver de nuevo
            </button>
          }
        />
      )}
    </div>
  );
}
