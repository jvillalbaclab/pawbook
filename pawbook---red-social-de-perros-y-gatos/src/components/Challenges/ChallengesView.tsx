import React, { useState } from "react";
import { DailyChallenge, Achievement, UserGamificationState, PetProfile } from "../../types";
import {
  Trophy,
  Flame,
  Sparkles,
  CheckCircle2,
  Gift,
  Target,
  Coins,
  ChevronRight,
} from "lucide-react";
import { playBark } from "../../utils/soundSynthesizer";
import { AchievementGallery } from "./AchievementGallery";

interface ChallengesViewProps {
  challenges: DailyChallenge[];
  achievements: Achievement[];
  gamificationState: UserGamificationState;
  activePet: PetProfile;
  onClaimChallenge: (challengeId: string) => void;
  onNavigateTab: (tabId: string) => void;
  onClaimDailyCheckin: () => void;
  hasClaimedToday: boolean;
  onUnlockBadgeWithPoints?: (badgeName: string, cost: number) => void;
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({
  challenges,
  achievements,
  gamificationState,
  activePet,
  onClaimChallenge,
  onNavigateTab,
  onClaimDailyCheckin,
  hasClaimedToday,
  onUnlockBadgeWithPoints,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"challenges" | "achievements" | "store">("challenges");
  const [claimedRewardToast, setClaimedRewardToast] = useState<string | null>(null);

  const nextLevelPoints = gamificationState.level * 150;
  const currentLevelBasePoints = (gamificationState.level - 1) * 150;
  const levelProgress = Math.min(
    100,
    Math.max(
      0,
      ((gamificationState.pawPoints - currentLevelBasePoints) /
        (nextLevelPoints - currentLevelBasePoints)) *
        100
    )
  );

  const completedCount = challenges.filter((c) => c.isCompleted).length;

  const handleClaim = (ch: DailyChallenge) => {
    playBark("happy");
    onClaimChallenge(ch.id);
    setClaimedRewardToast(`+${ch.points} PawPoints por '${ch.title}'`);
    setTimeout(() => setClaimedRewardToast(null), 3000);
  };

  const handleCheckin = () => {
    playBark("playful");
    onClaimDailyCheckin();
    setClaimedRewardToast("Bonus diario reclamado: +25 PawPoints");
    setTimeout(() => setClaimedRewardToast(null), 3000);
  };

  const storeBadges = [
    { name: "🌟 Estrella PawBook", cost: 100, desc: "Insignia estelar visible en el perfil de tu mascota" },
    { name: "🚀 Cohete Peludo", cost: 150, desc: "Reconocimiento a las mascotas más activas de la semana" },
    { name: "👑 Rey del Parque", cost: 200, desc: "Insignia de liderazgo en paseos y comunidad" },
    { name: "🍖 Amante de Premios", cost: 80, desc: "Distintivo especial para expertos en snacks" },
  ];

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-0 py-3.5 sm:py-5 space-y-4">
      {claimedRewardToast && (
        <div className="fixed top-20 right-4 z-50 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-[#FF5A36]" />
          <span className="font-semibold text-xs">{claimedRewardToast}</span>
        </div>
      )}

      {/* Clean Minimalist Pet Level & Daily Check-in Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={activePet.avatar}
              alt={activePet.name}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[#FF5A36]/80 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
                <span className="flex items-center gap-1 text-[#FF5A36] font-bold">
                  <Flame className="w-3.5 h-3.5 fill-[#FF5A36]" />
                  {gamificationState.streakDays}d racha
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-stone-800">Nvl {gamificationState.level}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{gamificationState.levelTitle}</span>
              </div>
              <h1 className="font-display text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight truncate">
                Misiones de {activePet.name}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckin}
            disabled={hasClaimedToday}
            className={`py-2.5 px-3.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 ${
              hasClaimedToday
                ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                : "bg-[#FF5A36] hover:bg-[#E04826] text-white active:scale-95 cursor-pointer shadow-2xs"
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>{hasClaimedToday ? "Reclamado" : "+25 pts hoy"}</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-stone-600 tabular-nums">
            <span>Progreso al siguiente nivel</span>
            <span>
              {gamificationState.pawPoints} / {nextLevelPoints} pts
            </span>
          </div>
          <div className="w-full bg-[#F3F1EC] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#FF5A36] h-full rounded-full transition-all duration-500"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Clean 3-Column Segmented Subtabs */}
      <div className="grid grid-cols-3 gap-1 bg-[#F3F1EC] p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveSubTab("challenges")}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "challenges"
              ? "bg-white text-stone-900 shadow-2xs"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Target className="w-3.5 h-3.5 text-[#FF5A36] shrink-0" />
          <span className="truncate">Retos ({completedCount}/{challenges.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("achievements")}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "achievements"
              ? "bg-white text-stone-900 shadow-2xs"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="truncate">Logros ({achievements.filter((a) => a.unlocked).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("store")}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "store"
              ? "bg-white text-stone-900 shadow-2xs"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">Canjear</span>
        </button>
      </div>

      {/* TAB 1: DAILY CHALLENGES */}
      {activeSubTab === "challenges" && (
        <div className="space-y-3">
          {challenges.map((ch) => {
            const isReadyToClaim = ch.currentCount >= ch.targetCount && !ch.isCompleted;
            const progressPct = Math.min(100, (ch.currentCount / ch.targetCount) * 100);

            return (
              <div
                key={ch.id}
                className={`p-5 rounded-3xl border transition-all space-y-3.5 flex flex-col justify-between ${
                  ch.isCompleted
                    ? "bg-[#FAF9F6] border-stone-200/60 opacity-75"
                    : isReadyToClaim
                    ? "bg-white border-[#FF5A36] shadow-sm"
                    : "bg-white border-stone-200/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF9F6] border border-stone-200/60 flex items-center justify-center text-lg shrink-0">
                      {ch.icon === "Sparkles" ? "✨" : ch.icon}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-stone-900 text-sm">{ch.title}</h3>
                      <p className="text-xs text-stone-500 leading-relaxed mt-0.5">
                        {ch.description}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#FF5A36] tabular-nums shrink-0">
                    +{ch.points} pts
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-stone-500 tabular-nums">
                      <span>Progreso</span>
                      <span>
                        {ch.currentCount} / {ch.targetCount}
                      </span>
                    </div>

                    <div className="w-full bg-[#F3F1EC] rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          ch.isCompleted
                            ? "bg-emerald-600"
                            : isReadyToClaim
                            ? "bg-[#FF5A36]"
                            : "bg-stone-800"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    {ch.isCompleted ? (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                      </span>
                    ) : isReadyToClaim ? (
                      <button
                        type="button"
                        onClick={() => handleClaim(ch)}
                        className="w-full py-2.5 bg-[#FF5A36] hover:bg-[#E04826] text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Reclamar +{ch.points} pts</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (ch.category === "feed") onNavigateTab("feed");
                          else if (ch.category === "social") onNavigateTab("pawmates");
                          else if (ch.category === "sound") onNavigateTab("soundboard");
                          else if (ch.category === "ai") onNavigateTab("ai");
                          else onNavigateTab("feed");
                        }}
                        className="px-3.5 py-1.5 bg-[#FAF9F6] hover:bg-[#F3F1EC] text-stone-700 font-semibold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Ir a misión</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: ACHIEVEMENTS */}
      {activeSubTab === "achievements" && (
        <AchievementGallery
          achievements={achievements}
          activePet={activePet}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* TAB 3: BADGE STORE */}
      {activeSubTab === "store" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 flex items-center justify-between text-xs">
            <span className="text-stone-600">
              Canjea tus puntos por insignias para el perfil de <strong>{activePet.name}</strong>.
            </span>
            <span className="font-bold text-stone-900 tabular-nums">
              Disponible: {gamificationState.pawPoints} pts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {storeBadges.map((badge, idx) => {
              const alreadyUnlocked = activePet.badges.includes(badge.name);
              const canAfford = gamificationState.pawPoints >= badge.cost;

              return (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-3xl border border-stone-200/80 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-stone-900 text-sm">
                        {badge.name}
                      </span>
                      <span className="text-xs font-bold text-[#FF5A36] tabular-nums">
                        {badge.cost} pts
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">{badge.desc}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onUnlockBadgeWithPoints && canAfford && !alreadyUnlocked) {
                        onUnlockBadgeWithPoints(badge.name, badge.cost);
                        playBark("happy");
                        setClaimedRewardToast(`Insignia '${badge.name}' añadida al perfil`);
                        setTimeout(() => setClaimedRewardToast(null), 3000);
                      }
                    }}
                    disabled={alreadyUnlocked || !canAfford}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      alreadyUnlocked
                        ? "bg-emerald-50 text-emerald-700 cursor-default"
                        : canAfford
                        ? "bg-stone-900 hover:bg-stone-800 text-white cursor-pointer active:scale-95"
                        : "bg-[#FAF9F6] text-stone-400 border border-stone-200/60 cursor-not-allowed"
                    }`}
                  >
                    {alreadyUnlocked
                      ? "Equipada en tu perfil"
                      : canAfford
                      ? "Canjear insignia"
                      : `Faltan ${badge.cost - gamificationState.pawPoints} pts`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
