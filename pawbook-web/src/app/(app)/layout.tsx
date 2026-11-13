import { BottomNav, MobileTopBar } from "@/features/shell/mobile-bars";
import { Sidebar } from "@/features/shell/sidebar";

/**
 * Armazón de la app (UI-002): 1 columna con barras móviles por debajo de 1.024 px,
 * menú lateral a partir de ahí. La tercera columna (≥ 1.280 px) la añade cada página.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <MobileTopBar />
      <div className="mx-auto flex max-w-[1320px] gap-7 lg:px-6">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 pb-28 lg:px-0 lg:py-6 lg:pb-10">{children}</main>
      </div>
      <BottomNav />
    </>
  );
}
