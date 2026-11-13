import type { ComponentType } from "react";
import { AdoptionIcon, HomeIcon, MessageIcon, PawIcon } from "@/design-system/icons";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  badge?: number;
};

const PawOutline = ({ size }: { size?: number }) => <PawIcon outline size={size} />;

/** Solo secciones que ya existen: nada de enlaces a pantallas vacías. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/pawmates", label: "PawMates", icon: PawOutline },
  { href: "/mensajes", label: "Mensajes", icon: MessageIcon, badge: 1 },
  { href: "/adopcion", label: "Adopción", icon: AdoptionIcon },
];

/** Una sección está activa si la ruta es ella o cuelga de ella ("/" solo exacta). */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
