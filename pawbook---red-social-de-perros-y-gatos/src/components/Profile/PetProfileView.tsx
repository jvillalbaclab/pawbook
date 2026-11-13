import React, { useState } from "react";
import { PetProfile, Post } from "../../types";
import { MapPin, Award, Edit3, Plus, X, Grid, Medal } from "lucide-react";
import { PostCard } from "../Feed/PostCard";

interface PetProfileViewProps {
  pet: PetProfile;
  allPets: PetProfile[];
  petPosts: Post[];
  onUpdatePet: (updatedPet: PetProfile) => void;
  onAddPet: (newPet: Omit<PetProfile, "id">) => void;
  onSelectPet: (pet: PetProfile) => void;
}

export const PetProfileView: React.FC<PetProfileViewProps> = ({
  pet,
  allPets,
  petPosts,
  onUpdatePet,
  onAddPet,
  onSelectPet,
}) => {
  const [activeProfileTab, setActiveProfileTab] = useState<"posts" | "badges">("posts");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editBio, setEditBio] = useState(pet.bio);
  const [editToy, setEditToy] = useState(pet.favoriteToy);
  const [editTreat, setEditTreat] = useState(pet.favoriteTreat);
  const [editLocation, setEditLocation] = useState(pet.location);

  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSpecies, setNewSpecies] = useState<"dog" | "cat">("dog");
  const [newBreed, setNewBreed] = useState("");
  const [newAge, setNewAge] = useState("1 año");
  const [newBio, setNewBio] = useState("");

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePet({
      ...pet,
      bio: editBio,
      favoriteToy: editToy,
      favoriteTreat: editTreat,
      location: editLocation,
    });
    setShowEditModal(false);
  };

  const handleCreateNewPet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const defaultAvatar =
      newSpecies === "dog"
        ? "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400"
        : "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400";

    onAddPet({
      name: newName.trim(),
      species: newSpecies,
      breed: newBreed.trim() || (newSpecies === "dog" ? "Perro Mestizo" : "Gato Mestizo"),
      avatar: defaultAvatar,
      age: newAge,
      gender: "macho",
      bio: newBio.trim() || "¡Nuevo amigo en PawBook! 🐾",
      location: "Madrid, España",
      favoriteToy: "Pelota de cuerda",
      favoriteTreat: "Snacks de salmón",
      personality: ["Juguetón", "Curioso"],
      badges: ["🐾 Recién Llegado a PawBook"],
      followersCount: 1,
      followingCount: 1,
      isOwner: true,
    });

    setNewName("");
    setNewBreed("");
    setNewBio("");
    setShowAddPetModal(false);
  };

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-0 py-3.5 sm:py-5 space-y-4">
      {/* Multi-Pet Switcher Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {allPets.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => onSelectPet(p)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                p.id === pet.id
                  ? "bg-stone-900 text-white"
                  : "bg-white border border-stone-200/80 text-stone-600 hover:bg-[#F3F1EC]"
              }`}
            >
              <img
                src={p.avatar}
                alt={p.name}
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full object-cover"
              />
              <span>{p.name}</span>
              <span>{p.species === "dog" ? "🐕" : "🐈"}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAddPetModal(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#FF5A36] bg-white border border-stone-200/80 hover:bg-[#FAF9F6] px-3 py-1.5 rounded-2xl transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Añadir mascota</span>
        </button>
      </div>

      {/* Instagram-Style Clean Profile Header Card */}
      <div className="bg-white rounded-3xl border border-stone-200/80 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative shrink-0">
            <div className="p-1 rounded-full bg-gradient-to-tr from-[#FF5A36] via-orange-400 to-amber-300">
              <img
                src={pet.avatar}
                alt={pet.name}
                referrerPolicy="no-referrer"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white"
              />
            </div>
            <span className="absolute bottom-1 right-1 text-base bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-sm">
              {pet.species === "dog" ? "🐕" : "🐈"}
            </span>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="font-display text-2xl font-extrabold text-stone-900">
                  {pet.name}
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  {pet.breed} · {pet.age} ·{" "}
                  <span className="inline-flex items-center gap-0.5 text-stone-600">
                    <MapPin className="w-3 h-3 text-[#FF5A36]" />
                    {pet.location}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditBio(pet.bio);
                  setEditToy(pet.favoriteToy);
                  setEditTreat(pet.favoriteTreat);
                  setEditLocation(pet.location);
                  setShowEditModal(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 bg-[#FAF9F6] hover:bg-[#F3F1EC] border border-stone-200/80 text-stone-800 px-3.5 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5 text-stone-500" />
                <span>Editar perfil</span>
              </button>
            </div>

            {/* Clean Tabular Metrics Row */}
            <div className="flex items-center justify-center sm:justify-start gap-6 py-2 border-y border-stone-100 text-xs">
              <div>
                <span className="font-display font-bold text-stone-900 tabular-nums mr-1">
                  {petPosts.length}
                </span>
                <span className="text-stone-500">publicaciones</span>
              </div>
              <div>
                <span className="font-display font-bold text-stone-900 tabular-nums mr-1">
                  {pet.followersCount}
                </span>
                <span className="text-stone-500">seguidores</span>
              </div>
              <div>
                <span className="font-display font-bold text-stone-900 tabular-nums mr-1">
                  {pet.followingCount}
                </span>
                <span className="text-stone-500">siguiendo</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">{pet.bio}</p>

            {/* Unboxed Personality Traits */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs text-stone-500">
              {pet.personality.map((trait, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <span className="font-medium text-stone-700">{trait}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Favorites Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="bg-[#FAF9F6] p-3.5 rounded-2xl border border-stone-200/60">
            <span className="text-[11px] text-stone-400 block">Juguete favorito</span>
            <span className="font-bold text-stone-900 mt-0.5 block">{pet.favoriteToy}</span>
          </div>
          <div className="bg-[#FAF9F6] p-3.5 rounded-2xl border border-stone-200/60">
            <span className="text-[11px] text-stone-400 block">Premio favorito</span>
            <span className="font-bold text-stone-900 mt-0.5 block">{pet.favoriteTreat}</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 bg-[#F3F1EC] p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveProfileTab("posts")}
          className={`flex-1 py-2 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeProfileTab === "posts"
              ? "bg-white text-stone-900 shadow-2xs"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Publicaciones ({petPosts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveProfileTab("badges")}
          className={`flex-1 py-2 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeProfileTab === "badges"
              ? "bg-white text-stone-900 shadow-2xs"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Medal className="w-3.5 h-3.5" />
          <span>Insignias ({pet.badges.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeProfileTab === "posts" && (
        <div className="space-y-5">
          {petPosts.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl text-center border border-stone-200/80">
              <p className="text-xs text-stone-500">
                {pet.name} aún no tiene publicaciones en el muro.
              </p>
            </div>
          ) : (
            petPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                activePet={pet}
                onReact={() => {}}
                onAddComment={() => {}}
                onSavePost={() => {}}
              />
            ))
          )}
        </div>
      )}

      {activeProfileTab === "badges" && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 space-y-4">
          <h3 className="font-display font-bold text-sm text-stone-900">
            Insignias de {pet.name}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pet.badges.map((badge, idx) => (
              <div
                key={idx}
                className="bg-[#FAF9F6] p-3.5 rounded-2xl border border-stone-200/60 flex items-center gap-2.5 text-xs font-bold text-stone-900"
              >
                <Award className="w-4 h-4 text-[#FF5A36] shrink-0" />
                <span>{badge}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Profile Modal — Mobile Bottom Sheet + Desktop Centered */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 pb-8 sm:pb-6 shadow-2xl relative border border-stone-200 animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto mb-3 sm:hidden" />

            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-[#FAF9F6] rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-bold text-stone-900 text-lg mb-4">
              Editar perfil de {pet.name}
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Biografía</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Juguete favorito
                </label>
                <input
                  type="text"
                  value={editToy}
                  onChange={(e) => setEditToy(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Premio favorito
                </label>
                <input
                  type="text"
                  value={editTreat}
                  onChange={(e) => setEditTreat(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Ubicación</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[46px] bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs py-3 rounded-xl transition-colors mt-2 cursor-pointer"
              >
                Guardar cambios
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add New Pet Modal — Mobile Bottom Sheet + Desktop Centered */}
      {showAddPetModal && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowAddPetModal(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 pb-8 sm:pb-6 shadow-2xl relative border border-stone-200 animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto mb-3 sm:hidden" />

            <button
              type="button"
              onClick={() => setShowAddPetModal(false)}
              className="absolute top-4 right-4 min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-[#FAF9F6] rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-bold text-stone-900 text-lg mb-4">
              Registrar nueva mascota
            </h3>

            <form onSubmit={handleCreateNewPet} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Rocky"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Especie</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSpecies("dog")}
                    className={`flex-1 py-2 rounded-xl border font-semibold text-xs cursor-pointer ${
                      newSpecies === "dog"
                        ? "bg-stone-900 border-stone-900 text-white"
                        : "bg-[#FAF9F6] border-stone-200 text-stone-700"
                    }`}
                  >
                    🐕 Perro
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSpecies("cat")}
                    className={`flex-1 py-2 rounded-xl border font-semibold text-xs cursor-pointer ${
                      newSpecies === "cat"
                        ? "bg-stone-900 border-stone-900 text-white"
                        : "bg-[#FAF9F6] border-stone-200 text-stone-700"
                    }`}
                  >
                    🐈 Gato
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Raza</label>
                <input
                  type="text"
                  placeholder="Ej: Beagle, Siamés, Mestizo..."
                  value={newBreed}
                  onChange={(e) => setNewBreed(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Edad</label>
                <input
                  type="text"
                  placeholder="Ej: 2 años"
                  value={newAge}
                  onChange={(e) => setNewAge(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Presentación
                </label>
                <textarea
                  rows={2}
                  placeholder="Cuéntanos qué le gusta hacer..."
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#FF5A36] hover:bg-[#E04826] text-white font-semibold text-xs py-3 rounded-xl transition-all mt-2 cursor-pointer"
              >
                Crear perfil 🐾
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
