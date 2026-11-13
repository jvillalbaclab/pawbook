import React from "react";
import { Sparkles, Sliders, RefreshCw, Smile, Volume2 } from "lucide-react";
import { playBark, playMeow, playSqueak } from "../../utils/soundSynthesizer";

export interface FilterPreset {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  soundType: "bark" | "meow" | "squeak";
  category: "dog" | "cat" | "funny" | "party" | "fantasy";
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "none",
    name: "Sin Filtro",
    emoji: "📷",
    tagline: "Foto original al natural",
    soundType: "bark",
    category: "funny",
  },
  {
    id: "dog_ears",
    name: "Orejas & Nariz de Perro",
    emoji: "🐶",
    tagline: "Orejas caídas y hocico mojado adorable",
    soundType: "bark",
    category: "dog",
  },
  {
    id: "cat_whiskers",
    name: "Bigotes & Orejas de Gato",
    emoji: "🐱",
    tagline: "Orejas puntiagudas rosadas y bigotes Kawaii",
    soundType: "meow",
    category: "cat",
  },
  {
    id: "thug_life",
    name: "Gafas Thug Life 🕶️",
    emoji: "🕶️",
    tagline: "Gafas pixeladas con cadena de oro y actitud",
    soundType: "squeak",
    category: "funny",
  },
  {
    id: "crown_vip",
    name: "Rey de PawBook 👑",
    emoji: "👑",
    tagline: "Corona dorada con diamantes y destellos",
    soundType: "bark",
    category: "party",
  },
  {
    id: "unicorn_horn",
    name: "Unicornio Mágico 🦄",
    emoji: "🦄",
    tagline: "Cuerno arcoíris con destellos estelares",
    soundType: "squeak",
    category: "fantasy",
  },
  {
    id: "pirate_cap",
    name: "Pirata de los Siete Mares 🏴‍☠️",
    emoji: "🦜",
    tagline: "Sombrero pirata, parche de huella y loro",
    soundType: "bark",
    category: "funny",
  },
  {
    id: "fiesta_sombrero",
    name: "Fiesta Tapatía 🇲🇽",
    emoji: "🌶️",
    tagline: "Sombrero charro y bigotazo elegante",
    soundType: "bark",
    category: "party",
  },
  {
    id: "coquette_bow",
    name: "Moño Coquette Gigante 🎀",
    emoji: "🎀",
    tagline: "Lazo rosa satinado con corazones brillantes",
    soundType: "meow",
    category: "funny",
  },
  {
    id: "wizard_glasses",
    name: "Harry Paws ⚡",
    emoji: "👓",
    tagline: "Gafas de mago, rayo mágico y sombrero",
    soundType: "meow",
    category: "fantasy",
  },
  {
    id: "pizza_lover",
    name: "Chef Amante de Pizza 🍕",
    emoji: "🍕",
    tagline: "Gorro de chef y rebanada chorreando queso",
    soundType: "bark",
    category: "funny",
  },
  {
    id: "clown_fun",
    name: "Payasito Alegre 🤡",
    emoji: "🤡",
    tagline: "Nariz de bola roja y peluca multicolor",
    soundType: "squeak",
    category: "funny",
  },
  {
    id: "alien_eyes",
    name: "Invasor Alienígena 👽",
    emoji: "👽",
    tagline: "Gafas verdes alien y antenas de resorte",
    soundType: "squeak",
    category: "fantasy",
  },
  {
    id: "angel_halo",
    name: "Ángel Inocente 😇",
    emoji: "😇",
    tagline: "Aureola dorada flotante y alas de plumas",
    soundType: "meow",
    category: "fantasy",
  },
];

export const COLOR_FILTER_STYLES: { id: string; name: string; cssFilter: string }[] = [
  { id: "normal", name: "Normal", cssFilter: "none" },
  { id: "vivid", name: "Vívido Pop ✨", cssFilter: "saturate(1.4) contrast(1.1)" },
  { id: "warm", name: "Cálido Atardecer 🌅", cssFilter: "sepia(0.3) saturate(1.3) hue-rotate(-10deg)" },
  { id: "cool_cyan", name: "Fantasía Neón 🦄", cssFilter: "contrast(1.2) saturate(1.3) hue-rotate(180deg)" },
  { id: "bw", name: "Cine Negro 🎞️", cssFilter: "grayscale(1) contrast(1.2)" },
  { id: "rose", name: "Romántico Rosa 🌸", cssFilter: "sepia(0.2) saturate(1.2) hue-rotate(320deg)" },
];

interface PetFilterOverlayProps {
  overlayId?: string;
  scale?: number; // 0.8 to 1.4, default 1.0
  yOffset?: number; // -30 to 30, default 0 (% shift)
  colorStyle?: string;
  interactive?: boolean;
}

export const PetFilterOverlay: React.FC<PetFilterOverlayProps> = ({
  overlayId = "none",
  scale = 1.0,
  yOffset = 0,
  colorStyle = "normal",
}) => {
  if (!overlayId || overlayId === "none") return null;

  const currentPreset = FILTER_PRESETS.find((p) => p.id === overlayId);

  // Position style wrapper
  const transformStyle = {
    transform: `scale(${scale}) translateY(${yOffset}%)`,
    transformOrigin: "center top",
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-20 flex flex-col justify-between p-2">
      {/* Visual Overlay Elements */}
      <div className="w-full h-full relative" style={transformStyle}>
        {/* 1. DOG EARS & SNOUT */}
        {overlayId === "dog_ears" && (
          <div className="w-full h-full relative">
            {/* Left Ear */}
            <div className="absolute top-1 left-2 sm:left-4 w-20 h-28 sm:w-28 sm:h-36 bg-amber-800 rounded-b-[70px] rounded-t-[20px] transform -rotate-25 border-4 border-amber-950 shadow-lg flex items-center justify-center animate-bounce-slow">
              <div className="w-10 h-20 bg-amber-400/80 rounded-b-[40px] rounded-t-[10px]" />
            </div>
            {/* Right Ear */}
            <div className="absolute top-1 right-2 sm:right-4 w-20 h-28 sm:w-28 sm:h-36 bg-amber-800 rounded-b-[70px] rounded-t-[20px] transform rotate-25 border-4 border-amber-950 shadow-lg flex items-center justify-center animate-bounce-slow">
              <div className="w-10 h-20 bg-amber-400/80 rounded-b-[40px] rounded-t-[10px]" />
            </div>
            {/* Snout in middle */}
            <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-12 h-9 bg-black rounded-b-2xl rounded-t-xl shadow-xl border-2 border-amber-900/60 relative flex items-center justify-center">
                <div className="w-4 h-2 bg-white/40 rounded-full top-1 left-2 absolute" />
              </div>
              <div className="w-0.5 h-3 bg-black/80" />
              <div className="w-8 h-3 border-b-2 border-black rounded-b-full" />
            </div>
          </div>
        )}

        {/* 2. CAT WHISKERS & EARS */}
        {overlayId === "cat_whiskers" && (
          <div className="w-full h-full relative">
            {/* Left Pointy Ear */}
            <div className="absolute top-2 left-4 sm:left-8 w-16 h-20 sm:w-20 sm:h-24 bg-purple-900 clip-triangle transform -rotate-12 border-2 border-purple-950 shadow-md flex items-center justify-center">
              <div className="w-10 h-12 bg-pink-300/90 clip-triangle" />
            </div>
            {/* Right Pointy Ear */}
            <div className="absolute top-2 right-4 sm:right-8 w-16 h-20 sm:w-20 sm:h-24 bg-purple-900 clip-triangle transform rotate-12 border-2 border-purple-950 shadow-md flex items-center justify-center">
              <div className="w-10 h-12 bg-pink-300/90 clip-triangle" />
            </div>
            {/* Nose & Whiskers */}
            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-7 h-5 bg-pink-400 rounded-b-md rounded-t-sm shadow-md" />
              {/* Whiskers Left */}
              <div className="absolute -left-16 top-1 space-y-1">
                <div className="w-14 h-0.5 bg-white/90 transform -rotate-6 shadow-xs" />
                <div className="w-16 h-0.5 bg-white/90" />
                <div className="w-14 h-0.5 bg-white/90 transform rotate-6 shadow-xs" />
              </div>
              {/* Whiskers Right */}
              <div className="absolute -right-16 top-1 space-y-1">
                <div className="w-14 h-0.5 bg-white/90 transform rotate-6 shadow-xs" />
                <div className="w-16 h-0.5 bg-white/90" />
                <div className="w-14 h-0.5 bg-white/90 transform -rotate-6 shadow-xs" />
              </div>
            </div>
          </div>
        )}

        {/* 3. THUG LIFE SUNGLASSES */}
        {overlayId === "thug_life" && (
          <div className="w-full h-full relative">
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center drop-shadow-xl animate-pulse-subtle">
              {/* Black Pixel Glasses */}
              <div className="bg-black text-white px-4 py-2 font-mono font-black text-xl sm:text-2xl rounded-xs border-2 border-white flex items-center gap-1 shadow-2xl">
                <span>[ DEAL WITH IT ]</span>
              </div>
              {/* Gold Chain below */}
              <div className="mt-8 text-yellow-400 text-3xl font-black drop-shadow-md">
                🪙 ⛓️ THUG PAWS ⛓️ 🪙
              </div>
            </div>
          </div>
        )}

        {/* 4. CROWN VIP */}
        {overlayId === "crown_vip" && (
          <div className="w-full h-full relative">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="text-6xl sm:text-7xl filter drop-shadow-2xl animate-bounce">
                👑
              </div>
              <div className="bg-amber-400 text-amber-950 font-black text-[10px] sm:text-xs px-3 py-0.5 rounded-full border-2 border-amber-900 shadow-lg tracking-widest uppercase -mt-2">
                Rey de PawBook
              </div>
            </div>
            <div className="absolute top-12 left-6 text-2xl animate-spin-slow">✨</div>
            <div className="absolute top-8 right-6 text-2xl animate-spin-slow">⭐</div>
          </div>
        )}

        {/* 5. UNICORN HORN */}
        {overlayId === "unicorn_horn" && (
          <div className="w-full h-full relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="text-6xl sm:text-7xl filter drop-shadow-2xl animate-pulse">
                🦄
              </div>
              <div className="flex gap-2 text-xl">
                <span className="animate-ping">✨</span>
                <span className="animate-bounce">💖</span>
                <span className="animate-ping">✨</span>
              </div>
            </div>
          </div>
        )}

        {/* 6. PIRATE CAP */}
        {overlayId === "pirate_cap" && (
          <div className="w-full h-full relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="text-6xl sm:text-7xl filter drop-shadow-xl">
                🏴‍☠️
              </div>
            </div>
            {/* Eyepatch on left */}
            <div className="absolute top-[38%] left-[38%] w-8 h-8 bg-black rounded-full border-2 border-amber-400 flex items-center justify-center text-xs shadow-lg">
              🐾
            </div>
            {/* Parrot on right shoulder */}
            <div className="absolute bottom-4 right-4 text-4xl filter drop-shadow-md animate-bounce">
              🦜
            </div>
          </div>
        )}

        {/* 7. FIESTA SOMBRERO */}
        {overlayId === "fiesta_sombrero" && (
          <div className="w-full h-full relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="text-7xl sm:text-8xl filter drop-shadow-2xl">
                🤠
              </div>
            </div>
            {/* Black Handlebar Mustache */}
            <div className="absolute top-[52%] left-1/2 -translate-x-1/2 text-4xl filter drop-shadow-md">
              👨‍🏽‍🦱
            </div>
            <div className="absolute bottom-2 left-2 text-2xl">🌮</div>
            <div className="absolute bottom-2 right-2 text-2xl">🎸</div>
          </div>
        )}

        {/* 8. COQUETTE BOW */}
        {overlayId === "coquette_bow" && (
          <div className="w-full h-full relative">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="text-7xl sm:text-8xl filter drop-shadow-xl animate-pulse">
                🎀
              </div>
            </div>
            <div className="absolute top-10 left-6 text-2xl">💕</div>
            <div className="absolute top-10 right-6 text-2xl">🌸</div>
          </div>
        )}

        {/* 9. WIZARD GLASSES */}
        {overlayId === "wizard_glasses" && (
          <div className="w-full h-full relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="text-6xl sm:text-7xl filter drop-shadow-xl">
                🧙‍♂️
              </div>
            </div>
            {/* Round glasses */}
            <div className="absolute top-[38%] left-1/2 -translate-x-1/2 flex items-center gap-1">
              <div className="w-10 h-10 border-4 border-amber-900 rounded-full bg-white/20 shadow-md" />
              <div className="w-3 h-1 bg-amber-900" />
              <div className="w-10 h-10 border-4 border-amber-900 rounded-full bg-white/20 shadow-md" />
            </div>
            {/* Lightning bolt */}
            <div className="absolute top-[28%] left-1/2 -translate-x-1/2 text-2xl text-yellow-400 font-black animate-pulse">
              ⚡
            </div>
          </div>
        )}

        {/* 10. PIZZA LOVER */}
        {overlayId === "pizza_lover" && (
          <div className="w-full h-full relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2">
              <div className="text-6xl sm:text-7xl">👨‍🍳</div>
            </div>
            {/* Slice in mouth */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-5xl transform rotate-12 animate-bounce">
              🍕
            </div>
          </div>
        )}

        {/* 11. CLOWN FUN */}
        {overlayId === "clown_fun" && (
          <div className="w-full h-full relative">
            <div className="absolute top-1 left-1/2 -translate-x-1/2">
              <div className="text-7xl sm:text-8xl">🤡</div>
            </div>
          </div>
        )}

        {/* 12. ALIEN EYES */}
        {overlayId === "alien_eyes" && (
          <div className="w-full h-full relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2">
              <div className="text-7xl sm:text-8xl animate-pulse">👽</div>
            </div>
            <div className="absolute top-4 left-4 text-3xl animate-bounce">🛸</div>
          </div>
        )}

        {/* 13. ANGEL HALO */}
        {overlayId === "angel_halo" && (
          <div className="w-full h-full relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="text-6xl sm:text-7xl filter drop-shadow-xl animate-pulse">
                😇
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Badge Label at bottom */}
      {currentPreset && (
        <div className="self-end bg-black/70 backdrop-blur-md text-amber-200 border border-amber-400/40 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
          <span>{currentPreset.emoji}</span>
          <span>Filtro: {currentPreset.name}</span>
        </div>
      )}
    </div>
  );
};

interface PetFilterSelectorProps {
  selectedOverlay: string;
  selectedScale: number;
  selectedYOffset: number;
  selectedColorStyle: string;
  onChangeOverlay: (id: string) => void;
  onChangeScale: (scale: number) => void;
  onChangeYOffset: (offset: number) => void;
  onChangeColorStyle: (styleId: string) => void;
}

export const PetFilterSelector: React.FC<PetFilterSelectorProps> = ({
  selectedOverlay,
  selectedScale,
  selectedYOffset,
  selectedColorStyle,
  onChangeOverlay,
  onChangeScale,
  onChangeYOffset,
  onChangeColorStyle,
}) => {
  const [activeTab, setActiveTab] = React.useState<"stickers" | "adjust" | "colors">("stickers");

  const handleSelectFilter = (preset: FilterPreset) => {
    onChangeOverlay(preset.id);

    // Play funny sound effect
    if (preset.soundType === "bark") playBark("playful");
    else if (preset.soundType === "meow") playMeow("cute");
    else playSqueak();
  };

  return (
    <div className="bg-[#FAF9F6] border border-stone-200/80 rounded-2xl p-3 space-y-3">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-stone-200/70 pb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Smile className="w-4 h-4 text-[#FF5A36]" />
          <span className="text-xs font-bold text-stone-900">Filtros PawSnap</span>
        </div>

        <div className="flex items-center gap-1 bg-[#F3F1EC] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("stickers")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === "stickers"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Disfraces 🐶
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("adjust")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === "adjust"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Ajustar 📐
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("colors")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              activeTab === "colors"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Color 🎨
          </button>
        </div>
      </div>

      {/* TAB 1: STICKERS & OVERLAYS */}
      {activeTab === "stickers" && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {FILTER_PRESETS.map((preset) => {
              const isSelected = selectedOverlay === preset.id;
              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => handleSelectFilter(preset)}
                  className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    isSelected
                      ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                      : "bg-white text-stone-800 border-stone-200/80 hover:bg-[#F3F1EC]"
                  }`}
                >
                  <span className="text-xl">{preset.emoji}</span>
                  <span className="text-[10px] font-semibold line-clamp-1 leading-tight">
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ADJUST SCALE & POSITION */}
      {activeTab === "adjust" && (
        <div className="space-y-3 bg-white p-3 rounded-xl border border-stone-200/80">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-stone-700 tabular-nums">
              <span>Tamaño del filtro</span>
              <span>{Math.round(selectedScale * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.05"
              value={selectedScale}
              onChange={(e) => onChangeScale(parseFloat(e.target.value))}
              className="w-full accent-[#FF5A36] cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-stone-700 tabular-nums">
              <span>Posición vertical</span>
              <span>{selectedYOffset}%</span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="2"
              value={selectedYOffset}
              onChange={(e) => onChangeYOffset(parseInt(e.target.value))}
              className="w-full accent-[#FF5A36] cursor-pointer"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                onChangeScale(1.0);
                onChangeYOffset(0);
              }}
              className="text-[11px] font-semibold text-stone-700 bg-[#F3F1EC] hover:bg-stone-200 px-3 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Restablecer</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: COLOR STYLES */}
      {activeTab === "colors" && (
        <div className="flex flex-wrap gap-1.5">
          {COLOR_FILTER_STYLES.map((style) => (
            <button
              type="button"
              key={style.id}
              onClick={() => onChangeColorStyle(style.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                selectedColorStyle === style.id
                  ? "bg-stone-900 text-white border-stone-900"
                  : "bg-white text-stone-700 border-stone-200/80 hover:bg-[#F3F1EC]"
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

