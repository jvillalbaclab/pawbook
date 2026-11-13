import React, { useState } from "react";
import { AdoptionPet } from "../../types";
import { Heart, MapPin, ShieldCheck, Mail, Phone, X, Search } from "lucide-react";

interface AdoptionViewProps {
  pets: AdoptionPet[];
}

export const AdoptionView: React.FC<AdoptionViewProps> = ({ pets }) => {
  const [filterSpecies, setFilterSpecies] = useState<"all" | "dog" | "cat">("all");
  const [cityQuery, setCityQuery] = useState("");
  const [selectedPet, setSelectedPet] = useState<AdoptionPet | null>(null);

  const [formSent, setFormSent] = useState(false);
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantMessage, setApplicantMessage] = useState("");

  const filteredPets = pets.filter((pet) => {
    if (filterSpecies === "dog" && pet.species !== "dog") return false;
    if (filterSpecies === "cat" && pet.species !== "cat") return false;
    if (cityQuery.trim()) {
      return (
        pet.city.toLowerCase().includes(cityQuery.toLowerCase()) ||
        pet.name.toLowerCase().includes(cityQuery.toLowerCase()) ||
        pet.breed.toLowerCase().includes(cityQuery.toLowerCase())
      );
    }
    return true;
  });

  const handleSendInterest = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
    setTimeout(() => {
      setFormSent(false);
      setSelectedPet(null);
      setApplicantName("");
      setApplicantPhone("");
      setApplicantMessage("");
    }, 2500);
  };

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-0 py-3.5 sm:py-5 space-y-4">
      {/* Header & Filter Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-2xs space-y-3.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
            <Heart className="w-3.5 h-3.5 text-[#FF5A36] fill-[#FF5A36]" />
            <span>Adopción responsable</span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
            Mascotas buscando hogar
          </h1>
          <p className="text-xs text-stone-500">
            Conecta con refugios verificados y dale una segunda oportunidad a un compañero leal.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-[#F3F1EC] p-1 rounded-2xl">
            {[
              { id: "all", label: "Todos" },
              { id: "dog", label: "Perros 🐕" },
              { id: "cat", label: "Gatos 🐈" },
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setFilterSpecies(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterSpecies === tab.id
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[150px]">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Ciudad o nombre..."
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-stone-200/80 rounded-xl py-2 pl-8 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
            />
          </div>
        </div>
      </div>

      {/* Grid of Adoption Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredPets.map((pet) => (
          <div
            key={pet.id}
            className="bg-white rounded-3xl border border-stone-200/80 hover:border-stone-300 transition-all overflow-hidden flex flex-col justify-between group"
          >
            <div>
              <div className="relative h-52 bg-stone-100 overflow-hidden">
                <img
                  src={pet.avatar}
                  alt={pet.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                <span className="absolute bottom-3 left-3 text-white text-xs font-medium flex items-center gap-1 drop-shadow">
                  <MapPin className="w-3.5 h-3.5 text-[#FF5A36]" />
                  <span>{pet.city}</span>
                </span>
              </div>

              <div className="p-4 space-y-2.5">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-bold text-stone-900 text-base">
                      {pet.name} {pet.species === "dog" ? "🐕" : "🐈"}
                    </h3>
                    <span className="text-xs font-semibold text-[#FF5A36]">{pet.urgency}</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {pet.breed} · {pet.age} · {pet.gender}
                  </p>
                </div>

                <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                  {pet.description}
                </p>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[11px] text-emerald-700 font-medium">
                  {pet.healthBadges.map((badge, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{badge}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 pt-0">
              <button
                type="button"
                onClick={() => setSelectedPet(pet)}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs py-2.5 rounded-xl transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5 text-[#FF5A36] fill-[#FF5A36]" />
                <span>Conocer a {pet.name}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Adoption Contact Modal — Mobile Bottom Sheet + Desktop Centered */}
      {selectedPet && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedPet(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-3xl p-5 sm:p-6 pb-8 sm:pb-6 shadow-2xl relative border border-stone-200 max-h-[92vh] overflow-y-auto animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto mb-3 sm:hidden" />

            <button
              type="button"
              onClick={() => setSelectedPet(null)}
              className="absolute top-4 right-4 min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-[#FAF9F6] rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 border-b border-stone-100 pb-4 mb-4">
              <img
                src={selectedPet.avatar}
                alt={selectedPet.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover"
              />
              <div>
                <h3 className="font-display font-bold text-stone-900 text-lg">
                  Adoptar a {selectedPet.name}
                </h3>
                <p className="text-xs text-stone-500">
                  {selectedPet.shelterName} · {selectedPet.city}
                </p>
              </div>
            </div>

            {formSent ? (
              <div className="py-8 text-center space-y-2.5">
                <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-lg font-bold">
                  ✓
                </div>
                <h4 className="font-display font-bold text-stone-900 text-base">
                  Solicitud enviada al refugio
                </h4>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  El equipo de <strong>{selectedPet.shelterName}</strong> se pondrá en contacto contigo pronto.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendInterest} className="space-y-4">
                <div className="bg-[#FAF9F6] p-3.5 rounded-2xl border border-stone-200/70 text-xs text-stone-700 space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    <span>{selectedPet.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{selectedPet.contactPhone}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Tu nombre completo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Laura Gómez"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Teléfono de contacto
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: +34 600 000 000"
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Háblanos de tu hogar
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Cuéntanos sobre tu experiencia con animales y el espacio disponible..."
                    value={applicantMessage}
                    onChange={(e) => setApplicantMessage(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#FF5A36] hover:bg-[#E04826] text-white font-semibold text-xs py-3 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Enviar solicitud de adopción
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
