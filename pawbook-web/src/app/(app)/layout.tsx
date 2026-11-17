import { useTranslations } from "next-intl";
import { BottomNav, MobileTopBar } from "@/features/shell/mobile-bars";
import { Sidebar } from "@/features/shell/sidebar";

/**
 * Armazón de la app (UI-002):
 * - < 1.024 px: 1 columna con barra superior y navegación inferior.
 * - ≥ 1.024 px: 2 columnas, menú lateral + contenido.
 * - ≥ 1.280 px: 3 columnas; la tercera (columna lateral, UI-008) la añade cada página.
 * Los rellenos respetan las zonas seguras del dispositivo (PWA a pantalla completa).
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("nav");
  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-xl bg-inverse px-4 py-2 font-bold text-on-inverse focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("skipToContent")}
      </a>
      <MobileTopBar />
      <div className="mx-auto flex max-w-[1320px] gap-7 lg:px-6">
        <Sidebar />
        <main
          id="contenido"
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] outline-none lg:px-0 lg:py-6 lg:pb-10"
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </>
  );
}
