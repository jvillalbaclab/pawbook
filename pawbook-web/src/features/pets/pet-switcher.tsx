"use client";

import { MAX_ACTIVE_PETS_PER_USER } from "@pawbook/contracts";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Avatar } from "@/design-system/avatar";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "@/design-system/icons";
import { Skeleton } from "@/design-system/states";
import { ONBOARDING_START_PATH } from "@/features/auth/guards";
import { toPetView, useActivePet, useActivePetStore } from "@/stores/active-pet";
import { useAuthStore } from "@/stores/auth";

type Variant = "chip" | "card";

/**
 * Selector de mascota activa (UI-003): visible siempre y a ≤ 2 interacciones.
 * variant "chip" para la barra móvil, "card" para el menú lateral de desktop.
 *
 * Las mascotas salen de `GET /v1/me/pets` (store de mascota activa). Sin sesión no se pinta
 * nada (así el HTML prerenderizado, siempre sin sesión, coincide con el primer render), y un
 * usuario sin mascotas ve el acceso para crear la primera (paso 2 del onboarding).
 *
 * Teclado (patrón "menu button" de WAI-ARIA): Intro/Espacio/↓ abren el menú con el foco en la
 * mascota activa; ↑/↓, Inicio y Fin se mueven; Escape cierra y devuelve el foco al botón.
 */
export function PetSwitcher({ variant }: { variant: Variant }) {
  const authenticated = useAuthStore((state) => state.status === "authenticated");
  const ready = useActivePetStore((state) => state.status === "ready");
  const activePet = useActivePet();

  if (!authenticated) return null;
  if (!ready) return <SwitcherSkeleton variant={variant} />;
  if (activePet === null) return <CreateFirstPet variant={variant} />;
  return <SwitcherMenu variant={variant} />;
}

function SwitcherMenu({ variant }: { variant: Variant }) {
  const t = useTranslations("pets");
  const pets = useActivePetStore((state) => state.pets);
  const select = useActivePetStore((state) => state.select);
  // Dentro de PetSwitcher siempre hay mascota activa.
  const activePet = useActivePet() ?? toPetView(pets[0]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const items = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  // Cierra el menú al hacer clic fuera.
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Al abrir, el foco va a la mascota activa.
  useEffect(() => {
    if (!open) return;
    const all = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [],
    );
    (all.find((item) => item.getAttribute("aria-checked") === "true") ?? all[0])?.focus();
  }, [open]);

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const all = items();
    const index = all.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => all[(next + all.length) % all.length]?.focus();
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(all.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  const menu = open && (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t("switcherLabel")}
      onKeyDown={onMenuKeyDown}
      className={`absolute z-30 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-popover ${
        variant === "chip" ? "top-12 right-0" : "bottom-full left-0 mb-2"
      }`}
    >
      {pets.map(toPetView).map((pet) => (
        <button
          key={pet.id}
          type="button"
          role="menuitemradio"
          tabIndex={-1}
          aria-checked={pet.id === activePet.id}
          onClick={() => {
            select(pet.id);
            close(true);
          }}
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left outline-none hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ink-2"
        >
          <Avatar name={pet.name} tone={pet.tone} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ink">{pet.name}</span>
            <span className="block truncate text-xs text-muted">@{pet.handle}</span>
          </span>
          {pet.id === activePet.id && <CheckIcon size={18} className="text-primary-ink" />}
        </button>
      ))}
      {pets.length < MAX_ACTIVE_PETS_PER_USER && (
        <Link
          href={ONBOARDING_START_PATH}
          role="menuitem"
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-line px-2.5 py-2 text-sm font-bold text-primary-ink outline-none hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ink-2"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-tint">
            <PlusIcon size={18} />
          </span>
          {t("addPet")}
        </Link>
      )}
    </div>
  );

  const triggerProps = {
    ref: triggerRef,
    type: "button" as const,
    "aria-haspopup": "menu" as const,
    "aria-expanded": open,
    onClick: () => setOpen((value) => !value),
    onKeyDown: onTriggerKeyDown,
  };

  if (variant === "chip") {
    return (
      <div ref={rootRef} className="relative">
        <button
          {...triggerProps}
          aria-label={t("activePetLabel", { name: activePet.name })}
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
    <div ref={rootRef} className="relative rounded-panel border border-line bg-surface p-3.5">
      <p className="mb-2.5 text-xs font-bold text-muted">{t("publishingAs")}</p>
      <button
        {...triggerProps}
        aria-label={t("activePetLabel", { name: activePet.name })}
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

/** Mientras llegan las mascotas: mismo tamaño que el selector, para que nada salte. */
function SwitcherSkeleton({ variant }: { variant: Variant }) {
  const t = useTranslations("pets");
  if (variant === "chip") {
    return (
      <span role="status" aria-label={t("loading")}>
        <Skeleton className="h-11 w-24 rounded-full" />
      </span>
    );
  }
  return (
    <div
      role="status"
      aria-label={t("loading")}
      className="flex items-center gap-2.5 rounded-panel border border-line bg-surface p-3.5"
    >
      <Skeleton className="size-[42px] shrink-0 rounded-full" />
      <Skeleton className="h-4 flex-1 rounded-full" />
    </div>
  );
}

/** Usuario sin mascotas: lleva a crear la primera. */
function CreateFirstPet({ variant }: { variant: Variant }) {
  const t = useTranslations("pets");
  if (variant === "chip") {
    return (
      <Link
        href={ONBOARDING_START_PATH}
        className="flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-bold text-primary-ink"
      >
        <PlusIcon size={18} />
        {t("createFirst")}
      </Link>
    );
  }
  return (
    <div className="rounded-panel border border-line bg-surface p-3.5">
      <p className="mb-2.5 text-xs font-bold text-muted">{t("noPets")}</p>
      <Link
        href={ONBOARDING_START_PATH}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-tint text-sm font-bold text-primary-ink"
      >
        <PlusIcon size={18} />
        {t("createFirst")}
      </Link>
    </div>
  );
}
