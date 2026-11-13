import React, { useState, useEffect, useRef } from "react";
import { PetProfile, PlaydateCandidate } from "../../types";
import {
  Heart,
  X,
  MapPin,
  Sparkles,
  Compass,
  Radio,
  Layers,
  MessageCircle,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { playBark, playMeow } from "../../utils/soundSynthesizer";

export interface PawChatMessage {
  id: string;
  sender: "user" | "candidate";
  text: string;
  timestamp: string;
  walkInvite?: {
    location: string;
    timeSlot: string;
    activity: string;
    status: "pending" | "accepted";
  };
}

interface PawMatesViewProps {
  candidates: PlaydateCandidate[];
  activePet: PetProfile;
  initialChatCandidateId?: string | null;
  onClearInitialChat?: () => void;
}

const DEFAULT_INITIAL_MATCH_IDS = ["pm-1", "pm-2"];

const buildInitialMessages = (
  candidates: PlaydateCandidate[],
  activePet: PetProfile
): Record<string, PawChatMessage[]> => {
  const initial: Record<string, PawChatMessage[]> = {};
  candidates.forEach((cand) => {
    const soundWord = cand.species === "dog" ? "¡Guau!" : "¡Miau!";
    initial[cand.id] = [
      {
        id: `init-${cand.id}-1`,
        sender: "candidate",
        text: `${soundWord} Hola ${activePet.name}, soy ${cand.name}. Suelo pasear por ${
          cand.locationName || "el parque cercano"
        } (${cand.distance}). ¡Mi actividad favorita es ${cand.favoriteActivity.toLowerCase()}! ¿Coordinamos un paseo? 🐾`,
        timestamp: "Hace 10 min",
      },
    ];
  });
  return initial;
};

const generateContextualReply = (
  candidate: PlaydateCandidate,
  activePet: PetProfile,
  userText: string,
  isWalkInvite: boolean,
  walkDetails?: { location: string; timeSlot: string; activity: string }
): string => {
  const lower = userText.toLowerCase();
  const greeting = candidate.species === "dog" ? "¡Guau, qué emoción! 🐕" : "¡Miau, me encanta la idea! 🐈";
  const park = candidate.locationName || "el parque";

  if (isWalkInvite && walkDetails) {
    return `${greeting} ¡Trato hecho! Nos vemos ${walkDetails.timeSlot.toLowerCase()} en ${walkDetails.location} para ${walkDetails.activity.toLowerCase()}. Mi humano llevará agua fresca y premios para ${activePet.name} y para mí. 🐾✨`;
  }

  if (lower.includes("hora") || lower.includes("cuándo") || lower.includes("cuando")) {
    return `Casi siempre salimos hacia ${park} alrededor de las 5:00 PM o por la mañana a las 9:30 AM. ¿A qué hora le queda mejor a ${activePet.name}? ⏰🐾`;
  }

  if (lower.includes("premio") || lower.includes("comida") || lower.includes("snack")) {
    return `${greeting} ¡Los premios son mi debilidad! Mi humano también llevará galletas naturales para compartir en ${park}. 🦴😋`;
  }

  if (lower.includes("parque") || lower.includes("paseo") || lower.includes("caminar") || lower.includes("vernos")) {
    return `¡Sí, vamos! Estamos a solo ${candidate.distance}, en ${park}. Podemos empezar con un paseo tranquilo y luego jugar a ${candidate.favoriteActivity.toLowerCase()}. 🎾🌳`;
  }

  if (lower.includes("lleva bien") || lower.includes("sociable") || lower.includes("jugar")) {
    return `¡Súper bien! Tengo energía ${candidate.energyLevel.toLowerCase()} y me encanta hacer nuevos amigos como ${activePet.name}. ¡Nos vamos a divertir muchísimo! 💕🐾`;
  }

  const fallbackReplies = [
    `${greeting} ¡Qué alegría hablar con ustedes! Avísame si quieren que nos encontremos en ${park} hoy o mañana. 🐾`,
    `¡Genial! A mí me encanta ${candidate.favoriteActivity.toLowerCase()}. ¿Les parece si agendamos un encuentro con el botón de "Proponer Paseo"? 🎾`,
    `¡Súper! Estamos muy cerquita (${candidate.distance}). Cuando ${activePet.name} esté listo para salir a ${park}, escríbenos por aquí. ✨`,
  ];

  return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
};

export const PawMatesView: React.FC<PawMatesViewProps> = ({
  candidates,
  activePet,
  initialChatCandidateId,
  onClearInitialChat,
}) => {
  const [viewMode, setViewMode] = useState<"map" | "cards" | "chats">("map");
  const [filterSpecies, setFilterSpecies] = useState<"all" | "dog" | "cat">("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchedPet, setMatchedPet] = useState<PlaydateCandidate | null>(null);

  const [selectedMapCandidate, setSelectedMapCandidate] = useState<PlaydateCandidate | null>(
    candidates[0] || null
  );
  const [isScanning, setIsScanning] = useState(false);

  // Persisted matched candidate IDs
  const [matchedIds, setMatchedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("pawbook_pawmates_matches");
      return saved ? JSON.parse(saved) : DEFAULT_INITIAL_MATCH_IDS;
    } catch {
      return DEFAULT_INITIAL_MATCH_IDS;
    }
  });

  // Persisted chat messages per candidate ID
  const [chatsByCandidate, setChatsByCandidate] = useState<Record<string, PawChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem("pawbook_pawmates_chats");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return buildInitialMessages(candidates, activePet);
  });

  const [activeChatCandidateId, setActiveChatCandidateId] = useState<string>(() => {
    return initialChatCandidateId || DEFAULT_INITIAL_MATCH_IDS[0] || candidates[0]?.id || "";
  });

  const [messageInput, setMessageInput] = useState("");
  const [typingCandidateId, setTypingCandidateId] = useState<string | null>(null);
  const [showWalkPlanner, setShowWalkPlanner] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("Hoy · 5:30 PM");
  const [selectedActivity, setSelectedActivity] = useState("Paseo en el parque y socializar");

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("pawbook_pawmates_matches", JSON.stringify(matchedIds));
    } catch {
      // ignore storage errors
    }
  }, [matchedIds]);

  useEffect(() => {
    try {
      localStorage.setItem("pawbook_pawmates_chats", JSON.stringify(chatsByCandidate));
    } catch {
      // ignore storage errors
    }
  }, [chatsByCandidate]);

  // Handle deep-link from App.tsx right sidebar "Saludar" button
  useEffect(() => {
    if (initialChatCandidateId) {
      const target = candidates.find((c) => c.id === initialChatCandidateId);
      if (target) {
        ensureCandidateInMatches(target);
        setActiveChatCandidateId(target.id);
        setViewMode("chats");
      }
      if (onClearInitialChat) {
        onClearInitialChat();
      }
    }
  }, [initialChatCandidateId, candidates]);

  // Auto-scroll chat when messages update
  useEffect(() => {
    if (viewMode === "chats") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [chatsByCandidate, activeChatCandidateId, viewMode, typingCandidateId]);

  const ensureCandidateInMatches = (cand: PlaydateCandidate) => {
    setMatchedIds((prev) => (prev.includes(cand.id) ? prev : [cand.id, ...prev]));
    setChatsByCandidate((prev) => {
      if (prev[cand.id] && prev[cand.id].length > 0) return prev;
      const soundWord = cand.species === "dog" ? "¡Guau!" : "¡Miau!";
      return {
        ...prev,
        [cand.id]: [
          {
            id: `init-${cand.id}-${Date.now()}`,
            sender: "candidate",
            text: `${soundWord} ¡Hola ${activePet.name}! Qué gusto conectar. Estoy por ${
              cand.locationName || "el parque"
            } (${cand.distance}). ¿Cuándo salimos a pasear? 🐾`,
            timestamp: "Justo ahora",
          },
        ],
      };
    });
  };

  const handleOpenChatWith = (cand: PlaydateCandidate, autoSendWalkInvite: boolean = false) => {
    ensureCandidateInMatches(cand);
    setActiveChatCandidateId(cand.id);
    setMatchedPet(null);
    setViewMode("chats");

    if (autoSendWalkInvite) {
      setTimeout(() => {
        handleSendWalkInvite(
          cand,
          "Hoy · 5:30 PM",
          cand.favoriteActivity || "Paseo por el parque"
        );
      }, 150);
    } else {
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 150);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (filterSpecies === "dog" && c.species !== "dog") return false;
    if (filterSpecies === "cat" && c.species !== "cat") return false;
    return true;
  });

  const currentCandidate = filteredCandidates[currentIndex];

  const matchedCandidates = candidates.filter((c) => matchedIds.includes(c.id));
  const activeChatCandidate =
    candidates.find((c) => c.id === activeChatCandidateId) ||
    matchedCandidates[0] ||
    candidates[0];

  const activeMessages = activeChatCandidate
    ? chatsByCandidate[activeChatCandidate.id] || []
    : [];

  const handleSwipe = (action: "pass" | "like") => {
    if (action === "like" && currentCandidate) {
      if (currentCandidate.species === "dog") {
        playBark("playful");
      } else {
        playMeow("cute");
      }
      ensureCandidateInMatches(currentCandidate);
      setMatchedPet(currentCandidate);
    }

    if (currentIndex < filteredCandidates.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(filteredCandidates.length);
    }
  };

  const handleConnectMapCandidate = (cand: PlaydateCandidate) => {
    if (cand.species === "dog") {
      playBark("playful");
    } else {
      playMeow("cute");
    }
    ensureCandidateInMatches(cand);
    setMatchedPet(cand);
  };

  const handleSendMessage = (customText?: string) => {
    if (!activeChatCandidate) return;
    const textToSend = (customText !== undefined ? customText : messageInput).trim();
    if (!textToSend) return;

    const targetCand = activeChatCandidate;
    const userMsg: PawChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: "Ahora",
    };

    setChatsByCandidate((prev) => ({
      ...prev,
      [targetCand.id]: [...(prev[targetCand.id] || []), userMsg],
    }));

    if (customText === undefined) {
      setMessageInput("");
    }

    // Trigger realistic reply from the matched pet
    setTypingCandidateId(targetCand.id);
    setTimeout(() => {
      if (targetCand.species === "dog") {
        playBark("happy");
      } else {
        playMeow("cute");
      }

      const replyText = generateContextualReply(targetCand, activePet, textToSend, false);
      const replyMsg: PawChatMessage = {
        id: `reply-${Date.now()}`,
        sender: "candidate",
        text: replyText,
        timestamp: "Ahora",
      };

      setChatsByCandidate((prev) => ({
        ...prev,
        [targetCand.id]: [...(prev[targetCand.id] || []), replyMsg],
      }));
      setTypingCandidateId(null);
    }, 950);
  };

  const handleSendWalkInvite = (
    targetCandidate?: PlaydateCandidate,
    timeSlotOverride?: string,
    activityOverride?: string
  ) => {
    const cand = targetCandidate || activeChatCandidate;
    if (!cand) return;

    const location = cand.locationName || "Parque cercano";
    const timeSlot = timeSlotOverride || selectedTimeSlot;
    const activity = activityOverride || selectedActivity;

    const inviteMsg: PawChatMessage = {
      id: `invite-${Date.now()}`,
      sender: "user",
      text: `¡Hola ${cand.name}! Te propongo un encuentro de paseo en ${location}.`,
      timestamp: "Ahora",
      walkInvite: {
        location,
        timeSlot,
        activity,
        status: "pending",
      },
    };

    setChatsByCandidate((prev) => ({
      ...prev,
      [cand.id]: [...(prev[cand.id] || []), inviteMsg],
    }));
    setShowWalkPlanner(false);

    // Candidate accepts walk invitation after a brief moment
    setTypingCandidateId(cand.id);
    setTimeout(() => {
      if (cand.species === "dog") {
        playBark("playful");
      } else {
        playMeow("cute");
      }

      const replyText = generateContextualReply(cand, activePet, "", true, {
        location,
        timeSlot,
        activity,
      });

      const replyMsg: PawChatMessage = {
        id: `reply-invite-${Date.now()}`,
        sender: "candidate",
        text: replyText,
        timestamp: "Ahora",
      };

      setChatsByCandidate((prev) => {
        const updatedList = (prev[cand.id] || []).map((m) =>
          m.id === inviteMsg.id && m.walkInvite
            ? { ...m, walkInvite: { ...m.walkInvite, status: "accepted" as const } }
            : m
        );
        return {
          ...prev,
          [cand.id]: [...updatedList, replyMsg],
        };
      });
      setTypingCandidateId(null);
    }, 1000);
  };

  const handleTriggerRadarScan = () => {
    setIsScanning(true);
    playBark("happy");
    setTimeout(() => {
      setIsScanning(false);
    }, 2500);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setMatchedPet(null);
  };

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-0 py-3.5 sm:py-5 space-y-4">
      {/* Clean Minimalist Header Card */}
      <div className="bg-white rounded-[24px] p-4 border border-stone-200/80 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-emerald-700">
              PawMates · {activePet.location || "Tu zona"}
            </p>
            <h1 className="font-display text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
              Amigos de paseo cercanos
            </h1>
          </div>

          {viewMode !== "chats" && (
            <div className="flex items-center gap-1 bg-[#F3F1EC] p-1 rounded-xl shrink-0">
              {[
                { id: "all", label: "Todos" },
                { id: "dog", label: "🐕" },
                { id: "cat", label: "🐈" },
              ].map((sp) => (
                <button
                  type="button"
                  key={sp.id}
                  onClick={() => {
                    setFilterSpecies(sp.id as "all" | "dog" | "cat");
                    setCurrentIndex(0);
                  }}
                  className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterSpecies === sp.id
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Full-Width Segmented Mode Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-[#F3F1EC] p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`min-h-[40px] px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === "map"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Radar</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`min-h-[40px] px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === "cards"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#FF5A36] shrink-0" />
            <span>Tarjetas</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("chats")}
            className={`min-h-[40px] px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === "chats"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#FF5A36] shrink-0" />
            <span>Chats ({matchedIds.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: CLEAN PARK RADAR MAP WITH COMPACT MOBILE OVERLAY */}
      {viewMode === "map" && (
        <div className="space-y-3.5">
          <div className="bg-white rounded-[24px] p-3.5 sm:p-4 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-stone-500 font-medium">
                Toca una mascota en el mapa para chatear
              </span>

              <button
                type="button"
                onClick={handleTriggerRadarScan}
                disabled={isScanning}
                className="min-h-[34px] px-3 py-1 bg-[#FAF9F6] hover:bg-[#F3F1EC] text-stone-800 rounded-xl text-xs font-semibold border border-stone-200/80 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Radio
                  className={`w-3.5 h-3.5 ${
                    isScanning ? "animate-spin text-emerald-600" : "text-emerald-600"
                  }`}
                />
                <span>{isScanning ? "Buscando..." : "Escanear"}</span>
              </button>
            </div>

            {/* Clean Light Botanical Park Map Canvas */}
            <div className="relative w-full h-[380px] sm:h-[430px] bg-[#EEF4F0] rounded-2xl overflow-hidden border border-emerald-900/10 select-none">
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern id="park-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                    <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#DCE7DF" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#park-grid)" />

                <path
                  d="M 20 50 Q 80 120 180 60 T 320 180 T 450 80 Q 550 20 650 140 Z"
                  fill="#D3E8DA"
                  opacity="0.7"
                />
                <path
                  d="M 300 280 Q 400 200 520 320 T 700 260 T 850 380 Z"
                  fill="#D3E8DA"
                  opacity="0.7"
                />

                <path
                  d="M -20 200 C 150 150, 250 300, 500 220 C 650 180, 750 320, 900 280"
                  fill="none"
                  stroke="#BAE6FD"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
              </svg>

              {/* Distance Rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-full border border-emerald-600/20 flex items-start justify-center">
                  <span className="text-[10px] font-semibold text-emerald-800/60 -mt-2.5 bg-[#EEF4F0] px-1.5">
                    800m
                  </span>
                </div>
                <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-emerald-600/15 flex items-start justify-center">
                  <span className="text-[10px] font-semibold text-emerald-800/50 -mt-2.5 bg-[#EEF4F0] px-1.5">
                    2.5 km
                  </span>
                </div>
              </div>

              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-72 h-72 rounded-full border-2 border-emerald-500/40 animate-ping" />
                </div>
              )}

              {/* Center User Pet Pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
                <div className="w-10 h-10 rounded-full ring-3 ring-[#FF5A36] ring-offset-2 ring-offset-white overflow-hidden shadow-md bg-white">
                  <img
                    src={activePet.avatar}
                    alt={activePet.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="mt-1 bg-stone-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  {activePet.name}
                </span>
              </div>

              {/* Nearby Candidate Pins */}
              {filteredCandidates.map((cand) => {
                const posX = cand.mapX ?? 50;
                const posY = cand.mapY ?? 50;
                const isSelected = selectedMapCandidate?.id === cand.id;
                const isMatched = matchedIds.includes(cand.id);

                return (
                  <button
                    type="button"
                    key={cand.id}
                    style={{ left: `${posX}%`, top: `${posY}%` }}
                    onClick={() => setSelectedMapCandidate(cand)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200 cursor-pointer flex flex-col items-center group ${
                      isSelected ? "scale-110 z-30" : "z-20 hover:scale-105"
                    }`}
                  >
                    <div
                      className={`relative w-11 h-11 rounded-full border-2 border-white overflow-hidden shadow-md ring-2 ${
                        isSelected
                          ? "ring-[#FF5A36]"
                          : isMatched
                          ? "ring-emerald-600"
                          : "ring-stone-400/70"
                      }`}
                    >
                      <img
                        src={cand.avatar}
                        alt={cand.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div
                      className={`mt-1 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs whitespace-nowrap transition-colors ${
                        isSelected
                          ? "bg-[#FF5A36] text-white border-[#FF5A36]"
                          : "bg-white/95 text-stone-900 border-stone-200/80"
                      }`}
                    >
                      <span>{cand.name}</span>
                      <span className={isSelected ? "text-white/90" : "text-stone-400 font-normal"}>
                        · {cand.distance}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Compact Mobile-First Selected Candidate Overlay Bar */}
              {selectedMapCandidate && (
                <div className="absolute bottom-2.5 left-2.5 right-2.5 z-40 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-stone-200/90 shadow-lg flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <img
                      src={selectedMapCandidate.avatar}
                      alt={selectedMapCandidate.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-stone-900 text-xs sm:text-sm truncate">
                        {selectedMapCandidate.name} · {selectedMapCandidate.distance}
                      </h3>
                      <p className="text-[11px] text-stone-500 truncate">
                        {selectedMapCandidate.breed} · {selectedMapCandidate.locationName || "Parque cercano"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenChatWith(selectedMapCandidate)}
                      className="min-h-[38px] px-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#FF5A36]" />
                      <span>Chat</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConnectMapCandidate(selectedMapCandidate)}
                      className="min-h-[38px] w-9 bg-[#FF5A36] hover:bg-[#E04826] text-white rounded-xl flex items-center justify-center cursor-pointer"
                      title="Hacer Match"
                    >
                      <Heart className="w-4 h-4 fill-white" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Clean List of Nearby Pets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              {filteredCandidates.map((cand) => {
                const isSelected = selectedMapCandidate?.id === cand.id;
                return (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedMapCandidate(cand)}
                    className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? "bg-[#FAF9F6] border-[#FF5A36]/50"
                        : "bg-white border-stone-200/70 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={cand.avatar}
                        alt={cand.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {cand.name} {cand.species === "dog" ? "🐕" : "🐈"} · {cand.distance}
                        </p>
                        <p className="text-[11px] text-stone-500 truncate">
                          {cand.locationName || cand.breed}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenChatWith(cand);
                      }}
                      className="min-h-[34px] px-3 rounded-xl bg-[#FAF9F6] hover:bg-stone-900 hover:text-white text-stone-800 text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#FF5A36]" />
                      <span>Chatear</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CLEAN SWIPE CARDS */}
      {viewMode === "cards" && (
        <div>
          {currentCandidate ? (
            <div className="bg-white rounded-[26px] border border-stone-200/80 overflow-hidden">
              <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                <img
                  src={currentCandidate.images[0] || currentCandidate.avatar}
                  alt={currentCandidate.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

                <div className="absolute bottom-3.5 left-4 right-4 text-white space-y-0.5">
                  <h3 className="font-display text-xl font-extrabold tracking-tight">
                    {currentCandidate.name} · {currentCandidate.age}
                  </h3>
                  <p className="text-xs text-stone-200">
                    {currentCandidate.breed} · {currentCandidate.locationName || "Parque cercano"} ({currentCandidate.distance})
                  </p>
                </div>
              </div>

              {/* Clean Unboxed Metadata & Bio */}
              <div className="p-4 space-y-3">
                <p className="text-xs text-stone-500 font-medium">
                  Energía <strong className="text-stone-800">{currentCandidate.energyLevel}</strong>
                  {" · "}Tamaño <strong className="text-stone-800">{currentCandidate.size}</strong>
                  {" · "}Ama <strong className="text-stone-800">{currentCandidate.favoriteActivity}</strong>
                </p>

                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  &ldquo;{currentCandidate.bio}&rdquo;
                </p>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSwipe("pass")}
                    className="w-12 h-12 rounded-2xl bg-[#FAF9F6] border border-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                    title="Pasar"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenChatWith(currentCandidate)}
                    className="flex-1 min-h-[48px] rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-[#FF5A36]" />
                    <span>Chatear ahora</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwipe("like")}
                    className="w-12 h-12 rounded-2xl bg-[#FF5A36] hover:bg-[#E04826] text-white flex items-center justify-center shadow-xs active:scale-90 transition-all cursor-pointer"
                    title="Hacer Match"
                  >
                    <Heart className="w-5 h-5 fill-current" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center border border-stone-200/80 my-6 space-y-3">
              <div className="text-3xl">🐾</div>
              <h3 className="font-display font-bold text-stone-900 text-base">
                Has visto todas las mascotas cercanas
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Reinicia la lista para volver a explorar o revisa tus conversaciones activas.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="bg-[#FAF9F6] hover:bg-[#F3F1EC] text-stone-800 font-semibold text-xs px-4 py-2.5 rounded-xl border border-stone-200 transition-colors cursor-pointer"
                >
                  Volver a explorar
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("chats")}
                  className="bg-[#FF5A36] hover:bg-[#E04826] text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Ir a mis Chats ({matchedIds.length})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 3: INTERACTIVE PAWCHAT & WALK COORDINATOR */}
      {viewMode === "chats" && (
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[540px]">
          {/* Left Column: Matches & Active Conversations List */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-stone-200/80 bg-[#FAF9F6]/60 flex flex-col shrink-0">
            <div className="p-4 border-b border-stone-200/60 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-sm text-stone-900">
                  Tus PawMatches
                </h2>
                <p className="text-[11px] text-stone-500">
                  Amigos listos para pasear
                </p>
              </div>
              <span className="text-xs font-bold text-[#FF5A36] bg-[#FF5A36]/10 px-2.5 py-0.5 rounded-full">
                {candidates.length} cerca
              </span>
            </div>

            {/* Horizontal scroll on mobile, vertical list on desktop */}
            <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto p-2 gap-1.5 no-scrollbar">
              {candidates.map((cand) => {
                const isSelected = activeChatCandidate?.id === cand.id;
                const isMatched = matchedIds.includes(cand.id);
                const msgs = chatsByCandidate[cand.id] || [];
                const lastMsg = msgs[msgs.length - 1];

                return (
                  <button
                    type="button"
                    key={cand.id}
                    onClick={() => {
                      ensureCandidateInMatches(cand);
                      setActiveChatCandidateId(cand.id);
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all cursor-pointer shrink-0 md:w-full ${
                      isSelected
                        ? "bg-stone-900 text-white shadow-2xs"
                        : "hover:bg-[#F3F1EC] text-stone-800"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={cand.avatar}
                        alt={cand.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display font-bold text-xs truncate flex items-center gap-1">
                          <span>{cand.name}</span>
                          <span>{cand.species === "dog" ? "🐕" : "🐈"}</span>
                        </span>
                        {isMatched && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              isSelected
                                ? "bg-[#FF5A36] text-white"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            Match
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] truncate mt-0.5 max-w-[140px] md:max-w-none ${
                          isSelected ? "text-stone-300" : "text-stone-500"
                        }`}
                      >
                        {lastMsg ? lastMsg.text : `📍 ${cand.locationName || cand.distance}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Conversation Window */}
          {activeChatCandidate ? (
            <div className="flex-1 flex flex-col min-w-0 bg-white">
              {/* Conversation Header */}
              <div className="p-4 border-b border-stone-200/80 flex items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("map")}
                    className="p-1.5 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-[#FAF9F6] cursor-pointer"
                    title="Volver al radar"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <img
                    src={activeChatCandidate.avatar}
                    alt={activeChatCandidate.name}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-500/40 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display font-bold text-sm sm:text-base text-stone-900 truncate">
                        {activeChatCandidate.name}
                      </h3>
                      <span className="text-xs text-stone-400">·</span>
                      <span className="text-xs text-stone-500 truncate">
                        {activeChatCandidate.breed}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>
                        {activeChatCandidate.locationName || "Parque cercano"} (
                        {activeChatCandidate.distance}) · En línea para pasear
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowWalkPlanner((prev) => !prev)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Proponer Paseo</span>
                </button>
              </div>

              {/* Walk / Playdate Collapsible Planner Drawer */}
              {showWalkPlanner && (
                <div className="p-4 bg-[#FAF9F6] border-b border-stone-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>
                        Agendar encuentro con {activeChatCandidate.name} en{" "}
                        {activeChatCandidate.locationName || "el parque"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowWalkPlanner(false)}
                      className="text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] text-stone-500 font-medium block mb-1">
                        Horario sugerido
                      </label>
                      <select
                        value={selectedTimeSlot}
                        onChange={(e) => setSelectedTimeSlot(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-stone-800 font-medium focus:outline-none focus:border-stone-400"
                      >
                        <option value="Hoy · 5:30 PM">Hoy · 5:30 PM</option>
                        <option value="Hoy · 7:00 PM">Hoy · 7:00 PM</option>
                        <option value="Mañana · 9:30 AM">Mañana · 9:30 AM</option>
                        <option value="Sábado · 11:00 AM">Sábado · 11:00 AM</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-stone-500 font-medium block mb-1">
                        Actividad del paseo
                      </label>
                      <select
                        value={selectedActivity}
                        onChange={(e) => setSelectedActivity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-stone-800 font-medium focus:outline-none focus:border-stone-400"
                      >
                        <option value={activeChatCandidate.favoriteActivity}>
                          {activeChatCandidate.favoriteActivity} (Su favorito)
                        </option>
                        <option value="Caminata tranquila por el parque">
                          Caminata tranquila por el parque
                        </option>
                        <option value="Jugar en zona canina / jardín">
                          Jugar en zona canina / jardín
                        </option>
                        <option value="Compartir premios y socializar">
                          Compartir premios y socializar
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSendWalkInvite()}
                      className="px-4 py-2 bg-[#FF5A36] hover:bg-[#E04826] text-white font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                    >
                      Enviar invitación de paseo 🐾
                    </button>
                  </div>
                </div>
              )}

              {/* Messages Feed */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[340px] bg-[#FAF9F6]/40">
                {activeMessages.map((msg) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isUser && (
                        <img
                          src={activeChatCandidate.avatar}
                          alt={activeChatCandidate.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      )}

                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed space-y-2 ${
                          isUser
                            ? "bg-stone-900 text-white rounded-br-xs"
                            : "bg-white text-stone-800 border border-stone-200/80 rounded-bl-xs shadow-2xs"
                        }`}
                      >
                        <p>{msg.text}</p>

                        {/* Structured Walk Invite Card inside message */}
                        {msg.walkInvite && (
                          <div
                            className={`p-3 rounded-xl border text-left space-y-1.5 ${
                              isUser
                                ? "bg-stone-800 border-stone-700 text-stone-100"
                                : "bg-[#FAF9F6] border-stone-200 text-stone-800"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-[#FF5A36] flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{msg.walkInvite.location}</span>
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  msg.walkInvite.status === "accepted"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-amber-500/20 text-amber-300"
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>
                                  {msg.walkInvite.status === "accepted"
                                    ? "Paseo Confirmado"
                                    : "Propuesta enviada"}
                                </span>
                              </span>
                            </div>
                            <div className="text-[11px] flex items-center gap-1.5 opacity-90">
                              <Clock className="w-3 h-3" />
                              <span>{msg.walkInvite.timeSlot}</span>
                            </div>
                            <div className="text-[11px] opacity-80">
                              🎾 Actividad: {msg.walkInvite.activity}
                            </div>
                          </div>
                        )}

                        <span
                          className={`block text-[10px] ${
                            isUser ? "text-stone-400 text-right" : "text-stone-400"
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>

                      {isUser && (
                        <img
                          src={activePet.avatar}
                          alt={activePet.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      )}
                    </div>
                  );
                })}

                {typingCandidateId === activeChatCandidate.id && (
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <img
                      src={activeChatCandidate.avatar}
                      alt={activeChatCandidate.name}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="bg-white border border-stone-200/80 px-3 py-1.5 rounded-2xl text-[11px] italic text-stone-500">
                      {activeChatCandidate.name} está escribiendo con las patitas... 🐾
                    </span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Quick Icebreaker Suggestions */}
              <div className="px-4 py-2 bg-white border-t border-stone-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  `¡Hola ${activeChatCandidate.name}! ¿Nos vemos hoy en ${
                    activeChatCandidate.locationName || "el parque"
                  }? 🐾`,
                  "¿A qué hora suelen salir a pasear? ⏰",
                  "¡Llevo premios saludables para compartir! 🦴",
                  `¿Jugamos a ${activeChatCandidate.favoriteActivity.toLowerCase()}? 🎾`,
                ].map((prompt, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="px-3 py-1 rounded-full bg-[#FAF9F6] hover:bg-[#F3F1EC] text-stone-700 text-[11px] font-medium border border-stone-200/70 whitespace-nowrap transition-colors cursor-pointer shrink-0"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Message Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3.5 bg-white border-t border-stone-200/80 flex items-center gap-2"
              >
                <input
                  ref={chatInputRef}
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Escribe un mensaje para ${activeChatCandidate.name}...`}
                  className="flex-1 bg-[#FAF9F6] border border-stone-200/80 rounded-2xl px-4 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="px-4 py-2.5 rounded-2xl bg-[#FF5A36] hover:bg-[#E04826] disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Enviar</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          ) : null}
        </div>
      )}

      {/* PawMatch Celebration Modal — Mobile Bottom Sheet + Desktop Centered Modal */}
      {matchedPet && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setMatchedPet(null)}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-[28px] sm:rounded-3xl p-6 pb-8 sm:pb-6 text-center shadow-2xl border border-stone-200/80 space-y-4 animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto sm:hidden" />

            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF5A36]">
              <Sparkles className="w-4 h-4" />
              <span>¡Nuevo PawMatch!</span>
            </div>

            <div className="flex items-center justify-center gap-4 py-2">
              <img
                src={activePet.avatar}
                alt={activePet.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-full object-cover ring-3 ring-[#FF5A36]"
              />
              <span className="text-2xl">🐾</span>
              <img
                src={matchedPet.avatar}
                alt={matchedPet.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-full object-cover ring-3 ring-emerald-500"
              />
            </div>

            <div>
              <h3 className="font-display text-xl font-bold text-stone-900">
                ¡{activePet.name} y {matchedPet.name} hicieron Match!
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Están a {matchedPet.distance} cerca de{" "}
                <strong className="text-stone-700">
                  {matchedPet.locationName || "el parque"}
                </strong>
                . ¡Hablen ahora para coordinar su encuentro!
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleOpenChatWith(matchedPet, false)}
                className="w-full min-h-[48px] bg-[#FF5A36] hover:bg-[#E04826] text-white font-semibold text-xs sm:text-sm py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chatear con {matchedPet.name} ahora 💬</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenChatWith(matchedPet, true)}
                className="w-full min-h-[48px] bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs sm:text-sm py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>
                  Enviar invitación a {matchedPet.locationName || "pasear"} 🐾
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMatchedPet(null)}
                className="w-full min-h-[44px] bg-[#FAF9F6] hover:bg-[#F3F1EC] text-stone-600 font-semibold text-xs py-2.5 rounded-2xl transition-colors cursor-pointer"
              >
                Seguir explorando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
