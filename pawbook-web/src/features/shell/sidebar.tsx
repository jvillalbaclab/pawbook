"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { PlusIcon } from "@/design-system/icons";
import { Logo } from "@/design-system/logo";
import { ThemeToggle } from "@/design-system/theme-toggle";
import { SessionMenu } from "@/features/auth/session-menu";
import { PetSwitcher } from "@/features/pets/pet-switcher";
import { isActivePath, NAV_ITEMS } from "./nav-items";

/**
 * Con Cache Components, usePathname suspende en rutas con params no prerenderizados.
 * El respaldo pinta el mismo menú sin resaltar la sección, así el armazón no salta.
 */
export function Sidebar() {
  return (
    <Suspense fallback={<SidebarView pathname={null} />}>
      <SidebarWithPath />
    </Suspense>
  );
}

function SidebarWithPath() {
  return <SidebarView pathname={usePathname()} />;
}

function SidebarView({ pathname }: { pathname: string | null }) {
  const t = useTranslations("nav");
  return (
    <aside className="sticky top-0 hidden h-dvh w-[230px] shrink-0 flex-col gap-5 py-6 lg:flex">
      <div className="px-2">
        <Logo />
      </div>
      <nav aria-label={t("label")} className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon, badge }) => {
          const active = pathname !== null && isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex h-[46px] items-center gap-3 rounded-control px-3.5 text-[15px] ${
                active
                  ? "bg-inverse font-bold text-on-inverse"
                  : "font-semibold text-ink-2 hover:bg-surface-2"
              }`}
            >
              <Icon size={21} />
              {t(labelKey)}
              {badge ? (
                <span className="ml-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/#publicar"
        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-bold text-white shadow-brand hover:bg-primary-hover"
      >
        <PlusIcon size={20} />
        {t("publish")}
      </Link>
      <div className="mt-auto flex flex-col gap-2">
        <PetSwitcher variant="card" />
        <ThemeToggle withLabel />
        <SessionMenu withLabel />
        <p className="px-3.5 text-xs text-muted">{t("sampleDataNotice")}</p>
      </div>
    </aside>
  );
}
