import React, { useState } from "react";
import { PetProfile, Post, ReactionType } from "../../types";
import { PostCard } from "./PostCard";
import {
  Camera,
  Plus,
  LayoutList,
  Smartphone,
  X,
  Volume2,
  Heart,
  Compass,
  Sparkles,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { playBark, playMeow } from "../../utils/soundSynthesizer";
import { TabType } from "../NavigationTabs";

interface FeedViewProps {
  posts: Post[];
  activePet: PetProfile;
  onReact: (postId: string, reaction: ReactionType) => void;
  onAddComment: (postId: string, commentText: string) => void;
  onSavePost: (postId: string) => void;
  onOpenCreatePost: () => void;
  searchQuery: string;
  onNavigateTab?: (tab: TabType) => void;
}

interface PetStory {
  id: string;
  petName: string;
  species: "dog" | "cat";
  breed: string;
  avatar: string;
  storyImage: string;
  caption: string;
  timeAgo: string;
}

const COMMUNITY_STORIES: PetStory[] = [
  {
    id: "st-1",
    petName: "Max",
    species: "dog",
    breed: "Golden Retriever",
    avatar: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400",
    storyImage: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=1000",
    caption: "Tarde de carreras en el parque con mi mejor amiga 🐕✨",
    timeAgo: "Hace 25m",
  },
  {
    id: "st-2",
    petName: "Milo",
    species: "cat",
    breed: "Gato Naranja",
    avatar: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400",
    storyImage: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=1000",
    caption: "Inspeccionando la mesa del desayuno con mis gafas nuevas 😎🐾",
    timeAgo: "Hace 1h",
  },
  {
    id: "st-3",
    petName: "Toby",
    species: "dog",
    breed: "Welsh Corgi",
    avatar: "https://images.unsplash.com/photo-1612536057832-2ff7ead58194?auto=format&fit=crop&q=80&w=400",
    storyImage: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=1000",
    caption: "¿Alguien dijo galleta de salmón? Estoy listo 🦴",
    timeAgo: "Hace 2h",
  },
  {
    id: "st-4",
    petName: "Luna",
    species: "cat",
    breed: "Siamés Real",
    avatar: "https://images.unsplash.com/photo-1513360382564-850120167616?auto=format&fit=crop&q=80&w=400",
    storyImage: "https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&q=80&w=1000",
    caption: "Siesta al sol de las 4 de la tarde. No molestar 🐈💤",
    timeAgo: "Hace 3h",
  },
  {
    id: "st-5",
    petName: "Bella",
    species: "dog",
    breed: "Border Collie",
    avatar: "https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?auto=format&fit=crop&q=80&w=400",
    storyImage: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=1000",
    caption: "Nuevo récord atrapando el frisbee en el aire 🥏",
    timeAgo: "Hace 4h",
  },
];

export const FeedView: React.FC<FeedViewProps> = ({
  posts,
  activePet,
  onReact,
  onAddComment,
  onSavePost,
  onOpenCreatePost,
  searchQuery,
  onNavigateTab,
}) => {
  const [filterSpecies, setFilterSpecies] = useState<"all" | "dog" | "cat" | "saved">("all");
  const [feedLayout, setFeedLayout] = useState<"classic" | "immersive">("classic");
  const [activeStory, setActiveStory] = useState<PetStory | null>(null);
  const [likedStories, setLikedStories] = useState<Record<string, boolean>>({});

  const filteredPosts = posts.filter((post) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchText =
        post.caption.toLowerCase().includes(q) ||
        post.petName.toLowerCase().includes(q) ||
        post.breed.toLowerCase().includes(q) ||
        (post.location && post.location.toLowerCase().includes(q));
      if (!matchText) return false;
    }

    if (filterSpecies === "dog") return post.species === "dog";
    if (filterSpecies === "cat") return post.species === "cat";
    if (filterSpecies === "saved") return post.isSaved;

    return true;
  });

  const handleOpenStory = (story: PetStory) => {
    setActiveStory(story);
    if (story.species === "dog") playBark("happy");
    else playMeow("cute");
  };

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-0 py-3.5 sm:py-5 space-y-4">
      {/* Instagram-Style Pet Stories Bar */}
      <div className="bg-white rounded-[24px] p-3.5 sm:p-4 border border-stone-200/75">
        <div className="flex items-center gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar">
          {/* Add Your Pet Story */}
          <button
            type="button"
            onClick={onOpenCreatePost}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="relative p-0.5 rounded-full border-2 border-dashed border-stone-300 group-hover:border-[#FF5A36] transition-colors">
              <img
                src={activePet.avatar}
                alt={activePet.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#FF5A36] text-white flex items-center justify-center ring-2 ring-white shadow-xs">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
            </div>
            <span className="text-[11px] font-semibold text-stone-800 truncate max-w-[68px]">
              Tu foto
            </span>
          </button>

          {/* Community Pet Stories */}
          {COMMUNITY_STORIES.map((story) => (
            <button
              type="button"
              key={story.id}
              onClick={() => handleOpenStory(story)}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer active:scale-95 transition-transform"
            >
              <div className="relative p-[2.5px] rounded-full bg-gradient-to-tr from-[#FF5A36] via-orange-400 to-amber-300 group-hover:scale-105 transition-transform">
                <img
                  src={story.avatar}
                  alt={story.petName}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-white"
                />
                <span className="absolute -bottom-0.5 -right-0.5 text-[11px] bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-2xs">
                  {story.species === "dog" ? "🐕" : "🐈"}
                </span>
              </div>
              <span className="text-[11px] font-medium text-stone-700 truncate max-w-[68px]">
                {story.petName}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Compact Mobile Feature Shortcuts (Clean 4-item pill row) */}
      {onNavigateTab && (
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => onNavigateTab("ai")}
            className="min-h-[38px] px-3 py-1.5 rounded-2xl bg-stone-900 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF5A36]" />
            <span>Traductor IA</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("vets")}
            className="min-h-[38px] px-3 py-1.5 rounded-2xl bg-white border border-stone-200/80 text-stone-800 text-xs font-semibold flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
            <span>Veterinarios</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("donations")}
            className="min-h-[38px] px-3 py-1.5 rounded-2xl bg-white border border-stone-200/80 text-stone-800 text-xs font-semibold flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Donaciones</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab("pawmates")}
            className="min-h-[38px] px-3 py-1.5 rounded-2xl bg-white border border-stone-200/80 text-stone-800 text-xs font-semibold flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#FF5A36]" />
            <span>Radar Amigos</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreatePost}
            className="min-h-[38px] px-3 py-1.5 rounded-2xl bg-white border border-stone-200/80 text-stone-800 text-xs font-semibold flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-[#FF5A36]" />
            <span>Filtros Foto</span>
          </button>
        </div>
      )}

      {/* Filter Segmented Bar & Layout Mode Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-[#F3F1EC] rounded-2xl overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "Para ti" },
            { id: "dog", label: "Perros 🐕" },
            { id: "cat", label: "Gatos 🐈" },
            { id: "saved", label: "Guardados" },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setFilterSpecies(tab.id as "all" | "dog" | "cat" | "saved")}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                filterSpecies === tab.id
                  ? "bg-white text-stone-900 shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feed Style Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#F3F1EC] rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setFeedLayout("classic")}
            className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              feedLayout === "classic"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-500 hover:text-stone-900"
            }`}
            title="Vista clásica tipo Instagram"
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Muro</span>
          </button>
          <button
            type="button"
            onClick={() => setFeedLayout("immersive")}
            className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              feedLayout === "immersive"
                ? "bg-stone-900 text-white shadow-2xs"
                : "text-stone-500 hover:text-stone-900"
            }`}
            title="Vista vertical inmersiva tipo TikTok"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>TikTok</span>
          </button>
        </div>
      </div>

      {/* Posts Feed */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-[24px] p-10 text-center border border-stone-200/75 my-4 space-y-3">
          <div className="text-3xl">🐾</div>
          <h3 className="font-display font-bold text-stone-900 text-base">
            No encontramos publicaciones
          </h3>
          <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
            Prueba a cambiar el filtro de especie o comparte un momento especial de {activePet.name}.
          </p>
          <button
            type="button"
            onClick={onOpenCreatePost}
            className="inline-flex items-center gap-1.5 bg-[#FF5A36] hover:bg-[#E04826] text-white text-xs font-semibold px-4 py-2.5 rounded-2xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear publicación</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              activePet={activePet}
              onReact={onReact}
              onAddComment={onAddComment}
              onSavePost={onSavePost}
              immersiveMode={feedLayout === "immersive"}
            />
          ))}
        </div>
      )}

      {/* Full-Screen Story Modal (Instagram / TikTok Story Experience) */}
      {activeStory && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
          onClick={() => setActiveStory(null)}
        >
          <div
            className="relative w-full h-full sm:max-w-sm sm:aspect-[9/16] sm:max-h-[86vh] sm:rounded-3xl overflow-hidden bg-stone-900 shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeStory.storyImage}
              alt={activeStory.petName}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/85 pointer-events-none" />

            {/* Top Story Bar */}
            <div className="relative z-10 p-4 pt-5 space-y-3">
              <div className="w-full bg-white/30 h-1 rounded-full overflow-hidden">
                <div className="bg-white h-full w-full rounded-full" />
              </div>

              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2.5">
                  <img
                    src={activeStory.avatar}
                    alt={activeStory.petName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FF5A36]"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-bold">
                      <span>{activeStory.petName}</span>
                      <span>{activeStory.species === "dog" ? "🐕" : "🐈"}</span>
                    </div>
                    <span className="text-xs text-stone-300">
                      {activeStory.breed} · {activeStory.timeAgo}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeStory.species === "dog") playBark("playful");
                      else playMeow("cute");
                    }}
                    className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/65 cursor-pointer"
                    title="Escuchar saludo"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStory(null)}
                    className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/65 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Story Caption & Quick Paw Reaction */}
            <div className="relative z-10 p-5 pb-8 sm:pb-5 space-y-4">
              <p className="text-white text-sm sm:text-base font-medium leading-relaxed drop-shadow">
                {activeStory.caption}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setLikedStories((prev) => ({
                      ...prev,
                      [activeStory.id]: !prev[activeStory.id],
                    }));
                    if (activeStory.species === "dog") playBark("happy");
                    else playMeow("cute");
                  }}
                  className={`w-full min-h-[48px] py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                    likedStories[activeStory.id]
                      ? "bg-[#FF5A36] text-white shadow-lg"
                      : "bg-white/20 backdrop-blur-md text-white hover:bg-white/30"
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${likedStories[activeStory.id] ? "fill-current" : ""}`}
                  />
                  <span>
                    {likedStories[activeStory.id] ? "¡Patita enviada! 🐾" : "Enviar Patita 🐾"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
