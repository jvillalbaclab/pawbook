"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { PlusIcon } from "@/design-system/icons";
import { Logo } from "@/design-system/logo";
import { ThemeToggle } from "@/design-system/theme-toggle";
import { PetSwitcher } from "@/features/pets/pet-switcher";
import { isActivePath, NAV_ITEMS } from "./nav-items";

/** Barra superior móvil (< 1.024 px): logo, tema y mascota activa siempre a mano. */
export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-canvas/95 px-4 py-3 backdrop-blur lg:hidden">
      <Logo />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <PetSwitcher variant="chip" />
      </div>
    </header>
  );
}

/** Barra inferior móvil con el botón de publicar en el centro. */
export function BottomNav() {
  // Mismo patrón que Sidebar: respaldo sin sección activa mientras la ruta no se conoce.
  return (
    <Suspense fallback={<BottomNavView pathname={null} />}>
      <BottomNavWithPath />
    </Suspense>
  );
}

function BottomNavWithPath() {
  return <BottomNavView pathname={usePathname()} />;
}

function BottomNavView({ pathname }: { pathname: string | null }) {
  const [home, pawmates, messages, adoption] = NAV_ITEMS;
  const left = [home, pawmates];
  const right = [messages, adoption];

  const item = ({ href, label, icon: Icon, badge }: (typeof NAV_ITEMS)[number]) => {
    const active = pathname !== null && isActivePath(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative flex flex-col items-center gap-0.5 text-[11px] ${
          active ? "font-bold text-primary-ink" : "font-semibold text-muted"
        }`}
      >
        <Icon size={24} />
        {label}
        {badge ? (
          <span className="absolute -top-1 right-[calc(50%-20px)] flex size-[18px] items-center justify-center rounded-full border-2 border-surface bg-primary text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-20 grid h-[78px] grid-cols-5 items-center border-t border-line bg-surface px-2 pb-3.5 lg:hidden"
    >
      {left.map(item)}
      <Link
        href="/#publicar"
        aria-label="Publicar"
        className="-mt-5 flex size-[54px] items-center justify-center justify-self-center rounded-[18px] bg-primary text-white shadow-lg shadow-primary/30"
      >
        <PlusIcon size={26} />
      </Link>
      {right.map(item)}
    </nav>
  );
}
