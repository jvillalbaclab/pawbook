import React, { useState } from "react";
import { Achievement, PetProfile } from "../../types";
import { Lock, Unlock, X, ChevronRight } from "lucide-react";
import { playBark } from "../../utils/soundSynthesizer";

interface AchievementGalleryProps {
  achievements: Achievement[];
  activePet?: PetProfile;
  onNavigateTab?: (tabId: string) => void;
}

export const AchievementGallery: React.FC<AchievementGalleryProps> = ({
  achievements,
  onNavigateTab,
}) => {
  const [filterStatus, setFilterStatus] = useState<"all" | "unlocked" | "locked">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  const filteredAchievements = achievements.filter((ach) => {
    if (filterStatus === "unlocked" && !ach.unlocked) return false;
    if (filterStatus === "locked" && ach.unlocked) return false;
    if (selectedCategory !== "all" && ach.category !== selectedCategory) return false;
    return true;
  });

  const handleCardClick = (ach: Achievement) => {
    if (ach.unlocked) playBark("happy");
    else playBark("playful");
    setSelectedAchievement(ach);
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "general":
        return "Comunidad";
      case "social":
        return "Amigos";
      case "ai":
        return "IA";
      case "market":
        return "Mercadito";
      default:
        return "General";
    }
  };

  return (
    <div className="space-y-5">
      {/* Clean Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200/80">
        <div className="flex items-center gap-1 bg-[#F3F1EC] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === "all"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("unlocked")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === "unlocked"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Logrados ({unlockedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("locked")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === "locked"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Pendientes ({totalCount - unlockedCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: "all", label: "Todas" },
            { id: "general", label: "General" },
            { id: "social", label: "Social" },
            { id: "ai", label: "IA" },
            { id: "market", label: "Tienda" },
          ].map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-stone-900 text-white"
                  : "text-stone-500 hover:bg-[#FAF9F6] hover:text-stone-900"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((ach) => (
          <div
            key={ach.id}
            onClick={() => handleCardClick(ach)}
            className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
              ach.unlocked
                ? "bg-white border-stone-200/90 hover:border-stone-300 shadow-2xs"
                : "bg-[#FAF9F6] border-stone-200/50 opacity-65 hover:opacity-90"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF9F6] border border-stone-200/70 flex items-center justify-center text-2xl">
                  {ach.badgeIcon}
                </div>

                {ach.unlocked ? (
                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <Unlock className="w-3 h-3" /> Desbloqueado
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-stone-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Pendiente
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-display font-bold text-stone-900 text-sm">{ach.title}</h4>
                <p className="text-xs text-stone-500 leading-relaxed mt-1">{ach.description}</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
              <span>{getCategoryLabel(ach.category)}</span>
              <span>{ach.unlocked ? ach.unlockedAt || "Completado" : "Ver detalles"}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Inspector Modal */}
      {selectedAchievement && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-stone-200 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedAchievement(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-800 hover:bg-[#FAF9F6] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 pt-2">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FAF9F6] border border-stone-200 flex items-center justify-center text-4xl">
                {selectedAchievement.badgeIcon}
              </div>
              <span className="text-xs text-stone-400 font-medium block">
                {getCategoryLabel(selectedAchievement.category)}
              </span>
              <h3 className="font-display text-lg font-bold text-stone-900">
                {selectedAchievement.title}
              </h3>
            </div>

            <p className="text-xs text-stone-600 text-center leading-relaxed bg-[#FAF9F6] p-3.5 rounded-2xl">
              {selectedAchievement.description}
            </p>

            {selectedAchievement.unlocked ? (
              <button
                type="button"
                onClick={() => setSelectedAchievement(null)}
                className="w-full py-2.5 bg-stone-900 text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSelectedAchievement(null);
                  if (onNavigateTab) {
                    if (selectedAchievement.category === "social") onNavigateTab("pawmates");
                    else if (selectedAchievement.category === "ai") onNavigateTab("ai");
                    else if (selectedAchievement.category === "market") onNavigateTab("market");
                    else onNavigateTab("feed");
                  }
                }}
                className="w-full py-2.5 bg-[#FF5A36] hover:bg-[#E04826] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Ir a completar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
