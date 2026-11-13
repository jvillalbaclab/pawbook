"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/design-system/avatar";
import { CheckIcon, ChevronDownIcon } from "@/design-system/icons";
import { MY_PETS } from "@/lib/sample-data";
import { useActivePet, useActivePetStore } from "@/stores/active-pet";

/**
 * Selector de mascota activa (UI-003): visible siempre y a ≤ 2 interacciones.
 * variant "chip" para la barra móvil, "card" para el menú lateral de desktop.
 */
export function PetSwitcher({ variant }: { variant: "chip" | "card" }) {
  const activePet = useActivePet();
  const setActivePet = useActivePetStore((state) => state.setActivePet);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Cierra el menú al hacer clic fuera o pulsar Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu = open && (
    <div
      role="menu"
      className={`absolute z-30 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-lg ${
        variant === "chip" ? "top-12 right-0" : "bottom-full left-0 mb-2"
      }`}
    >
      {MY_PETS.map((pet) => (
        <button
          key={pet.id}
          type="button"
          role="menuitemradio"
          aria-checked={pet.id === activePet.id}
          onClick={() => {
            setActivePet(pet.id);
            setOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-surface-2"
        >
          <Avatar name={pet.name} tone={pet.tone} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ink">{pet.name}</span>
            <span className="block truncate text-xs text-muted">@{pet.handle}</span>
          </span>
          {pet.id === activePet.id && <CheckIcon size={18} className="text-primary-ink" />}
        </button>
      ))}
    </div>
  );

  if (variant === "chip") {
    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Mascota activa: ${activePet.name}. Cambiar mascota`}
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface pr-2 pl-1 text-ink"
        >
          <Avatar name={activePet.name} tone={activePet.tone} size={34} />
          <span className="text-sm font-semibold">{activePet.name}</span>
          <ChevronDownIcon size={16} />
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative rounded-[18px] border border-line bg-surface p-3.5">
      <p className="mb-2.5 text-xs font-bold text-muted">Publicando como</p>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-xl text-left"
      >
        <Avatar name={activePet.name} tone={activePet.tone} size={42} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-ink">{activePet.name}</span>
          <span className="block truncate text-xs text-muted">@{activePet.handle}</span>
        </span>
        <ChevronDownIcon size={16} className="text-muted" />
      </button>
      {menu}
    </div>
  );
}
