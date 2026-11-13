import React, { useState } from "react";
import { Bell, Plus, ChevronDown, Check, Flame, Trophy, Search, X, PawPrint } from "lucide-react";
import { PetProfile } from "../types";

interface NavbarProps {
  pets: PetProfile[];
  activePet: PetProfile;
  onSelectPet: (pet: PetProfile) => void;
  onOpenCreatePost: () => void;
  onOpenAddPet: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  streakDays?: number;
  pawPoints?: number;
  onOpenChallenges?: () => void;
}

const QUICK_SEARCH_TAGS = ["Golden", "Gato", "Parque", "Siesta", "Corgi", "Jugando"];

export const Navbar: React.FC<NavbarProps> = ({
  pets,
  activePet,
  onSelectPet,
  onOpenCreatePost,
  onOpenAddPet,
  searchQuery,
  onSearchChange,
  streakDays = 3,
  pawPoints = 180,
  onOpenChallenges,
}) => {
  const [showPetMenu, setShowPetMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const mockNotifications = [
    { id: "1", text: "Toby el Corgi dio una patita a tu foto", time: "Hace 5 min", icon: "🐶" },
    { id: "2", text: "Cleo comentó: '¡Gran foto de siesta!'", time: "Hace 20 min", icon: "🐱" },
    { id: "3", text: "Bella (Border Collie) está lista para pasear cerca", time: "Hace 1 h", icon: "🐾" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/75">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="min-h-[44px] flex items-center gap-2 text-left group cursor-pointer shrink-0 focus:outline-none"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#FF5A36] to-[#FF8C42] text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform duration-150">
            <PawPrint className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
          </div>
          <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-stone-900 whitespace-nowrap">
            PawBook
          </span>
        </button>

        {/* Zone 2: Desktop Minimalist Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar perros, gatos, razas o amigos..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#F3F1EC] hover:bg-stone-200/60 focus:bg-white border border-transparent focus:border-stone-300 rounded-2xl py-2 pl-10 pr-8 text-sm text-stone-900 placeholder-stone-400 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Zone 3: Ergonomic Mobile & Desktop Actions (All >= 44px touch hitboxes) */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Mobile Search Toggle */}
          <button
            type="button"
            onClick={() => {
              setShowMobileSearch(!showMobileSearch);
              setShowNotifications(false);
              setShowPetMenu(false);
            }}
            className={`md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl transition-colors cursor-pointer ${
              showMobileSearch || searchQuery
                ? "bg-stone-900 text-white"
                : "text-stone-700 hover:bg-[#F3F1EC]"
            }`}
            title="Buscar"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Gamification Streak & Points Pill */}
          <button
            type="button"
            onClick={onOpenChallenges}
            className="min-h-[40px] sm:min-h-[42px] flex items-center gap-1.5 sm:gap-2 bg-[#F3F1EC] hover:bg-stone-200/70 px-2.5 sm:px-3 py-1.5 rounded-2xl text-xs font-semibold text-stone-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
            title="Retos y PawPoints"
          >
            <span className="flex items-center gap-1 text-[#FF5A36] font-bold tabular-nums">
              <Flame className="w-3.5 h-3.5 fill-[#FF5A36]" />
              <span>{streakDays}d</span>
            </span>
            <span className="text-stone-300" aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-stone-800 font-bold tabular-nums">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>{pawPoints}</span>
            </span>
          </button>

          {/* Desktop Create Post Button (On mobile it sits in the thumb-zone bottom bar) */}
          <button
            type="button"
            onClick={onOpenCreatePost}
            className="hidden sm:flex min-h-[42px] items-center gap-1.5 bg-[#FF5A36] hover:bg-[#E04826] text-white px-3.5 py-2 rounded-2xl font-semibold text-xs sm:text-sm shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Publicar</span>
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowPetMenu(false);
                setShowMobileSearch(false);
              }}
              className="relative min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-700 hover:bg-[#F3F1EC] rounded-2xl transition-colors cursor-pointer active:scale-95"
              title="Actividad reciente"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#FF5A36] rounded-full ring-2 ring-white" />
            </button>

            {/* Desktop Popover */}
            {showNotifications && (
              <div className="hidden sm:block absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-xl border border-stone-200/90 p-4 z-50">
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-stone-100">
                  <span className="font-display font-bold text-sm text-stone-900">
                    Actividad de la manada
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-[#FF5A36] font-semibold hover:underline cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="space-y-1.5">
                  {mockNotifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 hover:bg-[#FAF9F6] rounded-2xl transition-colors flex items-start gap-2.5 text-xs"
                    >
                      <span className="text-lg leading-none mt-0.5">{n.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-stone-800 leading-snug">{n.text}</p>
                        <span className="text-[11px] text-stone-400 mt-0.5 block">{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Pet Profile Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowPetMenu(!showPetMenu);
                setShowNotifications(false);
                setShowMobileSearch(false);
              }}
              className="min-h-[44px] flex items-center gap-1.5 p-1 pr-2 sm:pr-2.5 bg-[#FAF9F6] hover:bg-[#F3F1EC] border border-stone-200/80 rounded-full transition-all cursor-pointer shrink-0 active:scale-95"
              title="Cambiar de mascota"
            >
              <div className="relative">
                <img
                  src={activePet.avatar}
                  alt={activePet.name}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-[#FF5A36]/80"
                />
                <span className="absolute -bottom-0.5 -right-0.5 text-[10px] bg-white rounded-full px-0.5 shadow-2xs">
                  {activePet.species === "dog" ? "🐕" : "🐈"}
                </span>
              </div>
              <span className="text-xs font-bold text-stone-800 max-w-[76px] truncate hidden sm:inline">
                {activePet.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {/* Desktop Pet Switcher Popover */}
            {showPetMenu && (
              <div className="hidden sm:block absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-xl border border-stone-200/90 p-2.5 z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-stone-400">
                  Tus mascotas registradas
                </div>
                <div className="space-y-1 my-1">
                  {pets.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        onSelectPet(p);
                        setShowPetMenu(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-semibold transition-colors cursor-pointer ${
                        p.id === activePet.id
                          ? "bg-stone-900 text-white"
                          : "text-stone-700 hover:bg-[#FAF9F6]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.avatar}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="text-left">
                          <span className="block font-bold">
                            {p.name} {p.species === "dog" ? "🐕" : "🐈"}
                          </span>
                          <span
                            className={`block text-[10px] font-normal ${
                              p.id === activePet.id ? "text-stone-300" : "text-stone-400"
                            }`}
                          >
                            {p.breed}
                          </span>
                        </div>
                      </div>
                      {p.id === activePet.id && <Check className="w-4 h-4 text-[#FF5A36]" />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-stone-100 pt-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPetMenu(false);
                      onOpenAddPet();
                    }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-2xl text-xs font-semibold text-[#FF5A36] hover:bg-orange-50/50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Registrar otra mascota</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Mobile Search Bar & Quick Tags */}
      {showMobileSearch && (
        <div className="md:hidden px-3.5 pb-3 pt-1 bg-white border-t border-stone-100 space-y-2.5">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar mascota, raza o palabra..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-stone-200/90 rounded-2xl py-2.5 pl-10 pr-9 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 p-1 text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-stone-400 font-medium shrink-0 mr-1">
              Sugerencias:
            </span>
            {QUICK_SEARCH_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => onSearchChange(searchQuery === tag ? "" : tag)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                  searchQuery.toLowerCase() === tag.toLowerCase()
                    ? "bg-stone-900 text-white"
                    : "bg-[#F3F1EC] text-stone-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet: Notifications */}
      {showNotifications && (
        <div
          className="sm:hidden fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-end"
          onClick={() => setShowNotifications(false)}
        >
          <div
            className="w-full bg-white rounded-t-[28px] p-5 pb-8 shadow-2xl space-y-4 animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto" />
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-display font-bold text-base text-stone-900">
                Actividad reciente
              </h3>
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="min-h-[36px] px-3 rounded-xl bg-[#FAF9F6] text-xs font-semibold text-stone-600"
              >
                Listo
              </button>
            </div>
            <div className="space-y-2">
              {mockNotifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 bg-[#FAF9F6] rounded-2xl flex items-start gap-3 text-sm"
                >
                  <span className="text-xl leading-none mt-0.5">{n.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-stone-900 leading-snug text-xs sm:text-sm">
                      {n.text}
                    </p>
                    <span className="text-xs text-stone-400 mt-1 block">{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet: Pet Switcher */}
      {showPetMenu && (
        <div
          className="sm:hidden fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-end"
          onClick={() => setShowPetMenu(false)}
        >
          <div
            className="w-full bg-white rounded-t-[28px] p-5 pb-8 shadow-2xl space-y-4 animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto" />
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-stone-900">
                  Cambiar de mascota
                </h3>
                <p className="text-xs text-stone-500">
                  Elige con qué perfil quieres navegar y publicar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPetMenu(false)}
                className="p-2 rounded-full bg-[#FAF9F6] text-stone-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {pets.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    onSelectPet(p);
                    setShowPetMenu(false);
                  }}
                  className={`w-full min-h-[58px] flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                    p.id === activePet.id
                      ? "bg-stone-900 text-white shadow-sm"
                      : "bg-[#FAF9F6] text-stone-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={p.avatar}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-white/20"
                    />
                    <div>
                      <span className="block font-display font-bold text-sm">
                        {p.name} {p.species === "dog" ? "🐕" : "🐈"}
                      </span>
                      <span
                        className={`block text-xs ${
                          p.id === activePet.id ? "text-stone-300" : "text-stone-500"
                        }`}
                      >
                        {p.breed} · {p.age}
                      </span>
                    </div>
                  </div>
                  {p.id === activePet.id && (
                    <span className="w-7 h-7 rounded-full bg-[#FF5A36] text-white flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowPetMenu(false);
                onOpenAddPet();
              }}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-[#FF5A36]/10 text-[#FF5A36] font-bold text-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Registrar otra mascota en mi cuenta</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
