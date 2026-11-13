import React, { useState } from "react";
import {
  Home,
  Compass,
  Sparkles,
  Heart,
  HandHeart,
  Stethoscope,
  ShoppingBag,
  Volume2,
  User,
  Trophy,
  Plus,
  LayoutGrid,
  X,
  ChevronRight,
} from "lucide-react";

export type TabType =
  | "feed"
  | "pawmates"
  | "vets"
  | "donations"
  | "ai"
  | "challenges"
  | "market"
  | "adoption"
  | "soundboard"
  | "profile";

interface NavigationTabsProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  unclaimedChallengesCount?: number;
  onOpenCreatePost?: () => void;
}

export const NAV_ITEMS: {
  id: TabType;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
  animalHint: string;
}[] = [
  { id: "feed", label: "Inicio", shortLabel: "Inicio", icon: Home, animalHint: "Muro e historias" },
  {
    id: "pawmates",
    label: "PawMates",
    shortLabel: "Radar y Chat",
    icon: Compass,
    animalHint: "Mapa, matches y paseos",
  },
  {
    id: "vets",
    label: "Veterinarios",
    shortLabel: "Veterinarios",
    icon: Stethoscope,
    animalHint: "Telemedicina y consulta física",
  },
  {
    id: "donations",
    label: "Donaciones",
    shortLabel: "Donar",
    icon: HandHeart,
    animalHint: "Casos reales verificados",
  },
  {
    id: "challenges",
    label: "Retos y Logros",
    shortLabel: "Retos",
    icon: Trophy,
    animalHint: "Misiones y medallas",
  },
  {
    id: "ai",
    label: "Traductor IA",
    shortLabel: "IA Mascota",
    icon: Sparkles,
    animalHint: "Habla con tu mascota en vivo",
  },
  {
    id: "market",
    label: "Mercadito",
    shortLabel: "Mercadito",
    icon: ShoppingBag,
    animalHint: "Juguetes, camas y correas",
  },
  {
    id: "adoption",
    label: "Adopciones",
    shortLabel: "Adoptar",
    icon: Heart,
    animalHint: "Hogar para rescatados",
  },
  {
    id: "soundboard",
    label: "Sonidos",
    shortLabel: "Sonidos",
    icon: Volume2,
    animalHint: "Ladridos, maullidos y silbato",
  },
  {
    id: "profile",
    label: "Mi Mascota",
    shortLabel: "Perfil",
    icon: User,
    animalHint: "Biografía e insignias",
  },
];

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onChangeTab,
  unclaimedChallengesCount = 0,
  onOpenCreatePost,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isSecondaryTabActive = [
    "vets",
    "donations",
    "ai",
    "market",
    "adoption",
    "soundboard",
    "profile",
  ].includes(activeTab);
  const currentActiveItem = NAV_ITEMS.find((i) => i.id === activeTab);

  return (
    <>
      {/* Native-Grade Mobile Bottom Tab Bar (5 Ergonomic Thumb Slots, >= 48px Hitboxes) */}
      <nav
        aria-label="Navegación principal móvil"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-2 h-16 pb-safe grid grid-cols-5 items-center select-none"
      >
        {/* Slot 1: Inicio (Feed) */}
        <button
          type="button"
          onClick={() => {
            onChangeTab("feed");
            setIsMobileMenuOpen(false);
          }}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors cursor-pointer active:scale-95 ${
            activeTab === "feed" && !isMobileMenuOpen ? "text-[#FF5A36]" : "text-stone-500"
          }`}
        >
          <Home className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-bold tracking-tight">Inicio</span>
        </button>

        {/* Slot 2: PawMates (Radar + Matches + Chat) */}
        <button
          type="button"
          onClick={() => {
            onChangeTab("pawmates");
            setIsMobileMenuOpen(false);
          }}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors cursor-pointer active:scale-95 ${
            activeTab === "pawmates" && !isMobileMenuOpen ? "text-[#FF5A36]" : "text-stone-500"
          }`}
        >
          <Compass className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-bold tracking-tight">Radar</span>
        </button>

        {/* Slot 3: Primary Create Post CTA */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              if (onOpenCreatePost) onOpenCreatePost();
            }}
            className="w-12 h-10 rounded-2xl bg-gradient-to-tr from-[#FF5A36] to-[#FF8C42] text-white flex items-center justify-center shadow-md shadow-[#FF5A36]/25 active:scale-90 transition-transform cursor-pointer"
            title="Publicar foto"
          >
            <Plus className="w-5 h-5 stroke-[2.8]" />
          </button>
        </div>

        {/* Slot 4: Retos y Logros */}
        <button
          type="button"
          onClick={() => {
            onChangeTab("challenges");
            setIsMobileMenuOpen(false);
          }}
          className={`relative min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors cursor-pointer active:scale-95 ${
            activeTab === "challenges" && !isMobileMenuOpen ? "text-[#FF5A36]" : "text-stone-500"
          }`}
        >
          <div className="relative">
            <Trophy className="w-5 h-5 stroke-[2.2]" />
            {unclaimedChallengesCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] rounded-full bg-[#FF5A36] text-white text-[9px] font-extrabold flex items-center justify-center tabular-nums">
                {unclaimedChallengesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight">Retos</span>
        </button>

        {/* Slot 5: Menú de Atajos / Explorar Todo */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors cursor-pointer active:scale-95 ${
            isMobileMenuOpen || isSecondaryTabActive ? "text-[#FF5A36]" : "text-stone-500"
          }`}
        >
          <LayoutGrid className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-bold tracking-tight truncate max-w-[56px]">
            {isSecondaryTabActive && currentActiveItem ? currentActiveItem.shortLabel : "Menú"}
          </span>
        </button>
      </nav>

      {/* Mobile Bottom Sheet Drawer: All Sections & Quick Shortcuts */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-stone-950/55 backdrop-blur-xs flex items-end"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-[28px] p-5 pb-8 shadow-2xl space-y-4 animate-sheet-up max-h-[82vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto" />

            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-display font-extrabold text-base text-stone-900">
                  Explorar PawBook
                </h3>
                <p className="text-xs text-stone-500">
                  Accede rápido a todas las herramientas para tu mascota
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="min-h-[38px] min-w-[38px] rounded-full bg-[#FAF9F6] text-stone-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2-Column Tactile Shortcut Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const hasBadge = item.id === "challenges" && unclaimedChallengesCount > 0;

                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      onChangeTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`min-h-[72px] p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between active:scale-98 ${
                      isActive
                        ? "bg-stone-900 border-stone-900 text-white shadow-sm"
                        : "bg-[#FAF9F6] border-stone-200/70 text-stone-900 hover:bg-[#F3F1EC]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isActive ? "bg-white/15 text-[#FF5A36]" : "bg-white text-[#FF5A36] shadow-2xs"
                        }`}
                      >
                        <Icon className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      {hasBadge ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#FF5A36] text-white text-[10px] font-bold">
                          +{unclaimedChallengesCount}
                        </span>
                      ) : (
                        <ChevronRight
                          className={`w-4 h-4 ${isActive ? "text-stone-400" : "text-stone-300"}`}
                        />
                      )}
                    </div>

                    <div className="mt-2">
                      <span className="font-display font-bold text-xs block leading-tight">
                        {item.label}
                      </span>
                      <span
                        className={`text-[11px] block truncate mt-0.5 ${
                          isActive ? "text-stone-300" : "text-stone-500"
                        }`}
                      >
                        {item.animalHint}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
