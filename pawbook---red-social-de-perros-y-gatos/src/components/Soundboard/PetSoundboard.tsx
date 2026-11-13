import React, { useState } from "react";
import { Volume2 } from "lucide-react";
import { playBark, playMeow, playSqueak, playWhistle } from "../../utils/soundSynthesizer";

export const PetSoundboard: React.FC = () => {
  const [activeSoundLabel, setActiveSoundLabel] = useState<string | null>(null);

  const triggerSound = (name: string, fn: () => void) => {
    fn();
    setActiveSoundLabel(name);
    setTimeout(() => setActiveSoundLabel(null), 900);
  };

  const soundButtons = [
    {
      id: "b1",
      emoji: "🐕",
      name: "Ladrido alegre",
      desc: "Saludo amistoso de bienvenida",
      species: "Perros",
      action: () => playBark("happy"),
    },
    {
      id: "b2",
      emoji: "🐕‍🦺",
      name: "Ladrido guardián",
      desc: "Tono grave de alerta en casa",
      species: "Perros",
      action: () => playBark("deep"),
    },
    {
      id: "b3",
      emoji: "🎾",
      name: "Invitación a jugar",
      desc: "Ladrido corto y juguetón",
      species: "Perros",
      action: () => playBark("playful"),
    },
    {
      id: "m1",
      emoji: "🐈",
      name: "Maullido dulce",
      desc: "Saludo felino melodioso",
      species: "Gatos",
      action: () => playMeow("cute"),
    },
    {
      id: "m2",
      emoji: "🍽️",
      name: "Hora de comer",
      desc: "Maullido insistente frente al plato",
      species: "Gatos",
      action: () => playMeow("demanding"),
    },
    {
      id: "m3",
      emoji: "💤",
      name: "Ronroneo suave",
      desc: "Vibración armónica relajante",
      species: "Gatos",
      action: () => playMeow("purr"),
    },
    {
      id: "s1",
      emoji: "🦴",
      name: "Juguete de goma",
      desc: "Chirrido clásico que capta su atención",
      species: "Juego",
      action: () => playSqueak(),
    },
    {
      id: "s2",
      emoji: "🎶",
      name: "Silbato de parque",
      desc: "Frecuencia aguda de llamado",
      species: "Paseo",
      action: () => playWhistle(),
    },
  ];

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-0 py-3.5 sm:py-5 space-y-4">
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-2xs flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FF5A36]">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Audio interactivo</span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
            Caja de sonidos
          </h1>
          <p className="text-xs text-stone-500">
            Toca cualquier sonido para captar la atención de tu perro o gato.
          </p>
        </div>

        {activeSoundLabel && (
          <div className="bg-stone-900 text-white text-xs font-semibold px-3 py-2 rounded-2xl flex items-center gap-1.5 shrink-0">
            <Volume2 className="w-3.5 h-3.5 text-[#FF5A36] animate-pulse" />
            <span className="truncate max-w-[110px]">{activeSoundLabel}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {soundButtons.map((btn) => {
          const isPlaying = activeSoundLabel === btn.name;
          return (
            <button
              type="button"
              key={btn.id}
              onClick={() => triggerSound(btn.name, btn.action)}
              className={`p-4 rounded-3xl border text-left transition-all active:scale-95 flex flex-col justify-between min-h-[112px] cursor-pointer shadow-2xs ${
                isPlaying
                  ? "bg-stone-900 text-white border-stone-900 shadow-md"
                  : "bg-white hover:bg-[#FAF9F6] text-stone-900 border-stone-200/80 hover:border-stone-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{btn.emoji}</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isPlaying ? "text-[#FF5A36]" : "text-stone-400"
                  }`}
                >
                  {btn.species}
                </span>
              </div>

              <div className="mt-2.5">
                <h3
                  className={`font-display font-bold text-xs sm:text-sm leading-tight ${
                    isPlaying ? "text-white" : "text-stone-900"
                  }`}
                >
                  {btn.name}
                </h3>
                <p
                  className={`text-[11px] mt-0.5 leading-snug line-clamp-1 ${
                    isPlaying ? "text-stone-300" : "text-stone-500"
                  }`}
                >
                  {btn.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
