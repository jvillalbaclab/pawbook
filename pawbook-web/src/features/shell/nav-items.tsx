import type { ComponentType } from "react";
import { AdoptionIcon, HomeIcon, MessageIcon, PawIcon } from "@/design-system/icons";

/** Clave del texto en el catálogo (namespace "nav"). */
export type NavLabelKey = "home" | "pawmates" | "messages" | "adoption";

export type NavItem = {
  href: string;
  labelKey: NavLabelKey;
  icon: ComponentType<{ size?: number }>;
  badge?: number;
};

const PawOutline = ({ size }: { size?: number }) => <PawIcon outline size={size} />;

/** Solo secciones que ya existen: nada de enlaces a pantallas vacías. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "home", icon: HomeIcon },
  { href: "/pawmates", labelKey: "pawmates", icon: PawOutline },
  { href: "/mensajes", labelKey: "messages", icon: MessageIcon, badge: 1 },
  { href: "/adopcion", labelKey: "adoption", icon: AdoptionIcon },
];

/** Una sección está activa si la ruta es ella o cuelga de ella ("/" solo exacta). */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
