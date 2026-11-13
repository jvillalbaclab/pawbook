import React, { useState } from "react";
import { PetProfile, MoodTag, Post } from "../../types";
import { X, Sparkles, Image, MapPin, Loader2, Check } from "lucide-react";
import { PetFilterOverlay, PetFilterSelector, FILTER_PRESETS, COLOR_FILTER_STYLES } from "./PetFilterOverlay";

interface CreatePostModalProps {
  pets: PetProfile[];
  activePet: PetProfile;
  isOpen: boolean;
  onClose: () => void;
  onCreatePost: (newPost: Omit<Post, "id" | "timestamp" | "reactions" | "comments">) => void;
}

const PRESET_PET_IMAGES = [
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=1000",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=1000",
];

const MOODS: MoodTag[] = [
  "Juguetón 🎾",
  "Perezoso 😴",
  "Drama Total 🎭",
  "Modo Guardián 🛡️",
  "Comilón 🥩",
  "Explorador 🧭",
  "Cazador de Láser 🎯",
  "Amistad Incondicional 🐶❤️🐱",
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  pets,
  activePet,
  isOpen,
  onClose,
  onCreatePost,
}) => {
  const [selectedPet, setSelectedPet] = useState<PetProfile>(activePet);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState(PRESET_PET_IMAGES[0]);
  const [mood, setMood] = useState<MoodTag>("Juguetón 🎾");
  const [location, setLocation] = useState("");
  const [isGeneratingAICaption, setIsGeneratingAICaption] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const [filterOverlay, setFilterOverlay] = useState<string>("dog_ears");
  const [filterScale, setFilterScale] = useState<number>(1.0);
  const [filterYOffset, setFilterYOffset] = useState<number>(0);
  const [photoColorStyle, setPhotoColorStyle] = useState<string>("normal");

  if (!isOpen) return null;

  const handleGenerateAICaption = async () => {
    setIsGeneratingAICaption(true);
    setAiSuggestions([]);
    try {
      const res = await fetch("/api/gemini/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petName: selectedPet.name,
          species: selectedPet.species,
          breed: selectedPet.breed,
          mood: mood,
          description: caption || "Publicación divertida del día con filtro de fotos",
        }),
      });

      const data = await res.json();
      if (data.captions && data.captions.length > 0) {
        setAiSuggestions(data.captions.map((c: any) => c.text));
      }
    } catch (e) {
      console.error("AI Caption error:", e);
    } finally {
      setIsGeneratingAICaption(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) return;

    const currentPreset = FILTER_PRESETS.find((p) => p.id === filterOverlay);

    onCreatePost({
      petId: selectedPet.id,
      petName: selectedPet.name,
      petAvatar: selectedPet.avatar,
      species: selectedPet.species,
      breed: selectedPet.breed,
      location: location.trim() || selectedPet.location,
      mood: mood,
      imageUrl: imageUrl.trim() || undefined,
      filterOverlay: filterOverlay !== "none" ? filterOverlay : undefined,
      filterName: currentPreset && filterOverlay !== "none" ? currentPreset.name : undefined,
      photoFilterStyle: photoColorStyle !== "normal" ? photoColorStyle : undefined,
      caption: caption.trim(),
    });

    setCaption("");
    setImageUrl(PRESET_PET_IMAGES[0]);
    setLocation("");
    setAiSuggestions([]);
    setFilterOverlay("none");
    onClose();
  };

  const selectedCssFilter =
    COLOR_FILTER_STYLES.find((c) => c.id === photoColorStyle)?.cssFilter || "none";

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-stone-200/80 p-5 sm:p-6 pb-8 sm:pb-6 relative max-h-[92vh] overflow-y-auto sm:my-auto animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4 sticky top-0 bg-white z-20">
          <div>
            <h2 className="font-display text-lg font-extrabold text-stone-900">
              Nueva publicación
            </h2>
            <p className="text-xs text-stone-500">
              Añade orejas, bigotes o accesorios divertidos a tu foto
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-[#FAF9F6] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pet Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              Publicar como
            </label>
            <div className="flex gap-2 flex-wrap">
              {pets.map((pet) => (
                <button
                  type="button"
                  key={pet.id}
                  onClick={() => setSelectedPet(pet)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all text-xs font-semibold cursor-pointer ${
                    selectedPet.id === pet.id
                      ? "bg-stone-900 border-stone-900 text-white"
                      : "bg-[#FAF9F6] border-stone-200/80 text-stone-700 hover:bg-[#F3F1EC]"
                  }`}
                >
                  <img
                    src={pet.avatar}
                    alt={pet.name}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span>
                    {pet.name} {pet.species === "dog" ? "🐕" : "🐈"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Image Selection & Live Filter Studio */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-[#FF5A36]" />
                <span>Estudio de foto y filtros</span>
              </label>
              <span className="text-[11px] text-stone-400">Orejas, bigotes y accesorios</span>
            </div>

            {imageUrl && (
              <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 mb-3">
                <img
                  src={imageUrl}
                  alt="Vista previa"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-all duration-300"
                  style={{ filter: selectedCssFilter }}
                />

                <PetFilterOverlay
                  overlayId={filterOverlay}
                  scale={filterScale}
                  yOffset={filterYOffset}
                  colorStyle={photoColorStyle}
                />
              </div>
            )}

            <div className="grid grid-cols-6 gap-1.5 mb-3">
              {PRESET_PET_IMAGES.map((img, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setImageUrl(img)}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                    imageUrl === img
                      ? "border-[#FF5A36] scale-102"
                      : "border-transparent opacity-75 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img}
                    alt="preset"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="O pega el enlace URL de una foto..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 mb-3"
            />

            <PetFilterSelector
              selectedOverlay={filterOverlay}
              selectedScale={filterScale}
              selectedYOffset={filterYOffset}
              selectedColorStyle={photoColorStyle}
              onChangeOverlay={setFilterOverlay}
              onChangeScale={setFilterScale}
              onChangeYOffset={setFilterYOffset}
              onChangeColorStyle={setPhotoColorStyle}
            />
          </div>

          {/* Caption Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-600">Descripción</label>
              <button
                type="button"
                onClick={handleGenerateAICaption}
                disabled={isGeneratingAICaption}
                className="flex items-center gap-1 text-xs font-semibold text-[#FF5A36] bg-orange-50 hover:bg-orange-100/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {isGeneratingAICaption ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Sugerir con IA</span>
              </button>
            </div>

            <textarea
              rows={2}
              placeholder={`¿Qué piensa ${selectedPet.name}?`}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-stone-200 rounded-2xl p-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
            />

            {aiSuggestions.length > 0 && (
              <div className="mt-2 space-y-1.5 bg-[#FAF9F6] p-2.5 rounded-2xl border border-stone-200/80">
                <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#FF5A36]" /> Ideas generadas:
                </span>
                {aiSuggestions.map((sug, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setCaption(sug)}
                    className="w-full text-left text-xs p-2 bg-white hover:bg-orange-50/50 rounded-xl border border-stone-200/60 text-stone-800 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="line-clamp-2">{sug}</span>
                    <Check className="w-3.5 h-3.5 text-[#FF5A36] shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mood Tag Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              Estado de ánimo
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MOODS.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMood(m)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    mood === m
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-[#FAF9F6] text-stone-700 border-stone-200/80 hover:bg-[#F3F1EC]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#FF5A36]" />
              <span>Ubicación</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Parque del Retiro, Madrid"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 sticky bottom-0 bg-white">
            <button
              type="submit"
              disabled={!caption.trim()}
              className="w-full bg-[#FF5A36] hover:bg-[#E04826] disabled:opacity-40 text-white font-semibold py-3 rounded-2xl shadow-sm transition-all active:scale-98 text-sm cursor-pointer"
            >
              Compartir en PawBook 🐾
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
