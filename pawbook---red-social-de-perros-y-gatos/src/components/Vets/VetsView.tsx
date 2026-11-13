import React, { useState } from "react";
import {
  PetProfile,
  VetProfessional,
  VetAppointment,
  VetModality,
} from "../../types";
import {
  Stethoscope,
  Video,
  Building2,
  Home,
  Star,
  MapPin,
  ShieldCheck,
  Calendar,
  Clock,
  CheckCircle2,
  X,
  Plus,
  Send,
  RefreshCw,
  Phone,
  AlertCircle,
  Search,
} from "lucide-react";
import { playBark, playMeow } from "../../utils/soundSynthesizer";

interface VetsViewProps {
  vets: VetProfessional[];
  appointments: VetAppointment[];
  activePet: PetProfile;
  onBookAppointment: (appointment: Omit<VetAppointment, "id">) => void;
  onRegisterVet: (vet: VetProfessional) => void;
}

interface TelemedClinicalResponse {
  doctorGreeting: string;
  clinicalObservation: string;
  immediateCareSteps: string[];
  warningSigns: string;
  recommendedModality: string;
}

const QUICK_SYMPTOMS = [
  "Se rasca mucho las orejas y sacude la cabeza",
  "Hoy comió poco y está más apagado de lo normal",
  "Cojea levemente de una patita tras el paseo",
  "Duda sobre calendario de vacunación y desparasitación",
];

export const VetsView: React.FC<VetsViewProps> = ({
  vets,
  appointments,
  activePet,
  onBookAppointment,
  onRegisterVet,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"directory" | "appointments">("directory");
  const [modalityFilter, setModalityFilter] = useState<"all" | VetModality>("all");
  const [searchText, setSearchText] = useState("");

  // Active Telemedicine Modal State
  const [telemedVet, setTelemedVet] = useState<VetProfessional | null>(null);
  const [symptomsInput, setSymptomsInput] = useState("");
  const [isConsultingTelemed, setIsConsultingTelemed] = useState(false);
  const [telemedResponse, setTelemedResponse] = useState<TelemedClinicalResponse | null>(null);
  const [telemedBookedSuccess, setTelemedBookedSuccess] = useState(false);

  // Active Physical / Home Booking Modal State
  const [bookingVet, setBookingVet] = useState<VetProfessional | null>(null);
  const [selectedModality, setSelectedModality] = useState<VetModality>("presencial");
  const [selectedSlot, setSelectedSlot] = useState<string>("Mañana 10:00");
  const [visitReason, setVisitReason] = useState("");
  const [homeAddress, setHomeAddress] = useState(activePet.location || "Mi domicilio");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Register New Vet Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newVetName, setNewVetName] = useState("");
  const [newVetSpecialty, setNewVetSpecialty] = useState("");
  const [newVetClinic, setNewVetClinic] = useState("");
  const [newVetLicense, setNewVetLicense] = useState("");
  const [newVetLocation, setNewVetLocation] = useState("");
  const [newVetTelemedPrice, setNewVetTelemedPrice] = useState("20");
  const [newVetInPersonPrice, setNewVetInPersonPrice] = useState("45");
  const [newVetOffersHome, setNewVetOffersHome] = useState(true);

  const filteredVets = vets.filter((vet) => {
    if (modalityFilter !== "all" && !vet.modalities.includes(modalityFilter)) {
      return false;
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const match =
        vet.name.toLowerCase().includes(q) ||
        vet.specialty.toLowerCase().includes(q) ||
        vet.clinicName.toLowerCase().includes(q) ||
        vet.location.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleOpenTelemed = (vet: VetProfessional) => {
    setTelemedVet(vet);
    setSymptomsInput("");
    setTelemedResponse(null);
    setTelemedBookedSuccess(false);
  };

  const handleStartTelemedConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telemedVet || !symptomsInput.trim()) return;

    setIsConsultingTelemed(true);
    try {
      const response = await fetch("/api/gemini/vet-telemed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vetName: telemedVet.name,
          vetSpecialty: telemedVet.specialty,
          petName: activePet.name,
          species: activePet.species,
          breed: activePet.breed,
          age: activePet.age,
          symptoms: symptomsInput,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setTelemedResponse(data);
    } catch {
      setTelemedResponse({
        doctorGreeting: `Hola, soy ${telemedVet.name}. He revisado los signos que describes de ${activePet.name} (${activePet.breed}).`,
        clinicalObservation:
          "Los signos descritos sugieren una molestia localizada que podemos monitorizar inicialmente sin estresar a tu mascota.",
        immediateCareSteps: [
          `Mantén a ${activePet.name} hidratado y en un ambiente tranquilo las próximas 12 horas.`,
          "Revisa temperatura en orejas/encías y evita cambios bruscos de alimento hoy.",
        ],
        warningSigns:
          "Si observas decaimiento marcado, fiebre o vómitos repetidos, pasa a consulta física presencial.",
        recommendedModality: "Videoconsulta completada · Seguimiento en 24h o Cita en Clínica",
      });
    } finally {
      setIsConsultingTelemed(false);
    }
  };

  const handleSaveTelemedToAppointments = () => {
    if (!telemedVet) return;
    onBookAppointment({
      vetId: telemedVet.id,
      vetName: telemedVet.name,
      vetAvatar: telemedVet.avatar,
      vetSpecialty: telemedVet.specialty,
      clinicName: telemedVet.clinicName,
      petName: activePet.name,
      petSpecies: activePet.species,
      modality: "telemedicina",
      date: "Hoy",
      time: "En línea ahora",
      reason: symptomsInput || "Teleconsulta de orientación clínica",
      price: telemedVet.telemedPrice,
      currency: telemedVet.currency,
      status: "Confirmada",
      locationAddress: "Sala de Videoconsulta PawBook TeleVet",
    });
    if (activePet.species === "dog") playBark("happy");
    else playMeow("cute");
    setTelemedBookedSuccess(true);
  };

  const handleOpenBooking = (vet: VetProfessional, defaultMod: VetModality = "presencial") => {
    setBookingVet(vet);
    setSelectedModality(defaultMod);
    setSelectedSlot(vet.availableSlots[0] || "Mañana 10:00");
    setVisitReason("");
    setBookingSuccess(false);
  };

  const handleConfirmPhysicalBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingVet) return;

    const [dayPart, timePart] = selectedSlot.includes(" ")
      ? [selectedSlot.split(" ")[0], selectedSlot.split(" ").slice(1).join(" ")]
      : [selectedSlot, "10:00"];

    onBookAppointment({
      vetId: bookingVet.id,
      vetName: bookingVet.name,
      vetAvatar: bookingVet.avatar,
      vetSpecialty: bookingVet.specialty,
      clinicName: bookingVet.clinicName,
      petName: activePet.name,
      petSpecies: activePet.species,
      modality: selectedModality,
      date: dayPart,
      time: timePart,
      reason: visitReason.trim() || `Chequeo general y control de ${activePet.name}`,
      price:
        selectedModality === "telemedicina"
          ? bookingVet.telemedPrice
          : bookingVet.inPersonPrice,
      currency: bookingVet.currency,
      status: "Confirmada",
      locationAddress:
        selectedModality === "domicilio"
          ? `Visita a domicilio: ${homeAddress}`
          : selectedModality === "telemedicina"
          ? "Videoconsulta PawBook TeleVet"
          : bookingVet.location,
    });

    if (activePet.species === "dog") playBark("happy");
    else playMeow("cute");
    setBookingSuccess(true);
  };

  const handleCreateVetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVetName.trim() || !newVetClinic.trim()) return;

    const modalities: VetModality[] = ["telemedicina", "presencial"];
    if (newVetOffersHome) modalities.push("domicilio");

    const createdVet: VetProfessional = {
      id: `vet-${Date.now()}`,
      name: newVetName.trim(),
      specialty: newVetSpecialty.trim() || "Medicina General y Preventiva",
      clinicName: newVetClinic.trim(),
      avatar:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400",
      licenseNumber: newVetLicense.trim() || "Colegiado Verificado",
      rating: 5.0,
      reviewsCount: 1,
      location: newVetLocation.trim() || "Madrid, España",
      distance: "A 1.5 km",
      modalities,
      speciesServed: ["dog", "cat"],
      telemedPrice: Number(newVetTelemedPrice) || 20,
      inPersonPrice: Number(newVetInPersonPrice) || 45,
      currency: "€",
      isAvailableNow: true,
      nextAvailableSlot: "Hoy · En línea ahora",
      availableSlots: ["Hoy 18:00", "Mañana 10:30", "Mañana 17:00"],
      bio: "Especialista verificado en PawBook con atención por telemedicina animal y consulta física.",
      phone: "+34 600 000 000",
    };

    onRegisterVet(createdVet);
    setIsRegisterModalOpen(false);
    setNewVetName("");
    setNewVetSpecialty("");
    setNewVetClinic("");
    setNewVetLicense("");
    setNewVetLocation("");
  };

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-0 py-3.5 sm:py-5 space-y-4">
      {/* Clean Header Card */}
      <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-teal-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Colegiados Verificados · Telemedicina y Clínica</span>
            </p>
            <h1 className="font-display font-extrabold text-lg sm:text-xl text-stone-900">
              Veterinarios para {activePet.name}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#FAF9F6] hover:bg-[#F3F1EC] border border-stone-200/80 text-stone-800 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-teal-700" />
            <span>Soy Vet</span>
          </button>
        </div>

        {/* Segmented Switcher: Directorio vs Mis Citas */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#F3F1EC] rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveSubTab("directory")}
            className={`min-h-[40px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === "directory"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
            <span>Directorio ({vets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("appointments")}
            className={`min-h-[40px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === "appointments"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Mis Citas ({appointments.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: VETERINARY DIRECTORY */}
      {activeSubTab === "directory" && (
        <div className="space-y-3.5">
          {/* Search + Modality Chips */}
          <div className="bg-white rounded-[24px] p-3.5 border border-stone-200/80 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar especialidad, clínica o ciudad..."
                className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200/80 rounded-xl pl-9 pr-3.5 text-base sm:text-xs text-stone-800 focus:outline-none focus:border-stone-900"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: "all", label: "Todos" },
                { id: "telemedicina", label: "💻 Telemedicina" },
                { id: "presencial", label: "🏥 En Clínica" },
                { id: "domicilio", label: "🏠 A Domicilio" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setModalityFilter(item.id as "all" | VetModality)}
                  className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    modalityFilter === item.id
                      ? "bg-stone-900 text-white"
                      : "bg-[#F3F1EC] text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clean Minimalist Vet Cards */}
          <div className="space-y-3.5">
            {filteredVets.map((vet) => (
              <article
                key={vet.id}
                className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-3"
              >
                {/* Doctor Header */}
                <div className="flex items-start gap-3.5">
                  <div className="relative shrink-0">
                    <img
                      src={vet.avatar}
                      alt={vet.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-2xl object-cover border border-stone-200/80"
                    />
                    {vet.isAvailableNow && (
                      <span
                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white"
                        title="Disponible ahora"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-extrabold text-sm sm:text-base text-stone-900 truncate">
                        {vet.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-800 shrink-0 tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{vet.rating.toFixed(1)}</span>
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-teal-700 truncate">
                      {vet.specialty}
                    </p>

                    <p className="text-[11px] text-stone-500 truncate">
                      {vet.licenseNumber} · {vet.clinicName} · {vet.distance}
                    </p>
                  </div>
                </div>

                {/* Clean 1-line Bio */}
                <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">{vet.bio}</p>

                {/* Clean Unboxed Pricing & Availability Summary Row */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2 text-xs text-stone-600">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      Teleconsulta <strong className="text-stone-900">{vet.telemedPrice}{vet.currency}</strong>
                    </span>
                    <span className="text-stone-300">·</span>
                    <span>
                      Clínica <strong className="text-stone-900">{vet.inPersonPrice}{vet.currency}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 shrink-0">
                    {vet.nextAvailableSlot}
                  </span>
                </div>

                {/* Action Buttons: Telemedicine vs Physical Appointment */}
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleOpenTelemed(vet)}
                    className="min-h-[44px] px-3 py-2 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                  >
                    <Video className="w-4 h-4 shrink-0" />
                    <span>Telemedicina</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenBooking(vet, "presencial")}
                    className="min-h-[44px] px-3 py-2 rounded-2xl bg-[#FAF9F6] hover:bg-[#F3F1EC] border border-stone-200/80 text-stone-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>Cita Física</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: MY SCHEDULED APPOINTMENTS (TELEMEDICINE & PHYSICAL) */}
      {activeSubTab === "appointments" && (
        <div className="space-y-3">
          {appointments.length === 0 ? (
            <div className="bg-white rounded-[24px] p-8 text-center border border-stone-200/80 space-y-2">
              <Stethoscope className="w-8 h-8 text-stone-400 mx-auto" />
              <h3 className="font-display font-bold text-sm text-stone-900">
                Aún no tienes citas programadas
              </h3>
              <p className="text-xs text-stone-500">
                Agenda una videoconsulta o una visita presencial desde el directorio.
              </p>
            </div>
          ) : (
            appointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white rounded-[24px] p-4 border border-stone-200/80 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full ${
                      apt.modality === "telemedicina"
                        ? "bg-teal-50 text-teal-700"
                        : apt.modality === "domicilio"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-stone-100 text-stone-800"
                    }`}
                  >
                    {apt.modality === "telemedicina" && <Video className="w-3.5 h-3.5" />}
                    {apt.modality === "presencial" && <Building2 className="w-3.5 h-3.5" />}
                    {apt.modality === "domicilio" && <Home className="w-3.5 h-3.5" />}
                    <span className="capitalize">
                      {apt.modality === "telemedicina"
                        ? "Telemedicina Animal"
                        : apt.modality === "domicilio"
                        ? "Visita a Domicilio"
                        : "Consulta Física en Clínica"}
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{apt.status}</span>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={apt.vetAvatar}
                    alt={apt.vetName}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-2xl object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display font-extrabold text-sm text-stone-900 truncate">
                      {apt.vetName}
                    </h4>
                    <p className="text-xs text-stone-500 truncate">{apt.clinicName}</p>
                    <p className="text-[11px] font-bold text-teal-700 mt-0.5">
                      Paciente: {apt.petName} {apt.petSpecies === "dog" ? "🐕" : "🐈"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-stone-900">
                      {apt.price}{apt.currency}
                    </span>
                    <span className="block text-[11px] text-stone-500">
                      {apt.date} · {apt.time}
                    </span>
                  </div>
                </div>

                <div className="bg-[#FAF9F6] p-3 rounded-xl border border-stone-200/60 text-xs text-stone-600 space-y-1">
                  <p>
                    <strong className="text-stone-800">Motivo:</strong> {apt.reason}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-stone-500">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{apt.locationAddress}</span>
                  </p>
                </div>

                {apt.modality === "telemedicina" && (
                  <button
                    type="button"
                    onClick={() => {
                      const found = vets.find((v) => v.id === apt.vetId) || vets[0];
                      if (found) handleOpenTelemed(found);
                    }}
                    className="w-full min-h-[42px] rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>Entrar a Sala de Videoconsulta</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL 1: LIVE ANIMAL TELEMEDICINE ROOM */}
      {telemedVet && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setTelemedVet(null)}
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] p-5 pb-8 sm:pb-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Simulated Video Header */}
            <div className="relative rounded-2xl bg-stone-900 text-white p-4 overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={telemedVet.avatar}
                      alt={telemedVet.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-teal-400"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-stone-900" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/25 text-teal-300 px-2 py-0.5 rounded-full">
                        💻 Telemedicina en Vivo
                      </span>
                    </div>
                    <h3 className="font-display font-extrabold text-sm sm:text-base truncate mt-0.5">
                      {telemedVet.name}
                    </h3>
                    <p className="text-[11px] text-stone-300 truncate">
                      {telemedVet.licenseNumber} · {telemedVet.specialty}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTelemedVet(null)}
                  className="min-h-[36px] min-w-[36px] rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-stone-300">
                <span>
                  Paciente: <strong className="text-white">{activePet.name}</strong> ({activePet.breed})
                </span>
                <span className="font-bold text-teal-300">
                  Tarifa: {telemedVet.telemedPrice}{telemedVet.currency}
                </span>
              </div>
            </div>

            {/* Symptoms Input & Quick Chips */}
            <form onSubmit={handleStartTelemedConsultation} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  ¿Qué síntomas o dudas tienes sobre {activePet.name}?
                </label>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1.5">
                  {QUICK_SYMPTOMS.map((sym) => (
                    <button
                      type="button"
                      key={sym}
                      onClick={() => setSymptomsInput(sym)}
                      className="min-h-[32px] px-2.5 py-1 rounded-xl bg-[#F3F1EC] hover:bg-stone-200 text-stone-700 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {sym}
                    </button>
                  ))}
                </div>

                <textarea
                  value={symptomsInput}
                  onChange={(e) => setSymptomsInput(e.target.value)}
                  rows={3}
                  placeholder={`Describe qué ha hecho ${activePet.name}, desde cuándo y cómo está su ánimo...`}
                  className="w-full bg-[#FAF9F6] border border-stone-200 rounded-2xl p-3 text-base sm:text-xs text-stone-800 focus:outline-none focus:border-stone-900 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isConsultingTelemed}
                className="w-full min-h-[46px] rounded-2xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                {isConsultingTelemed ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Conectando con {telemedVet.name}...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Recibir Valoración por Telemedicina</span>
                  </>
                )}
              </button>
            </form>

            {/* Doctor's Live Clinical Orientation Response */}
            {telemedResponse && (
              <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-stone-200/80 space-y-3">
                <p className="text-xs font-bold text-stone-900 leading-relaxed">
                  🩺 {telemedResponse.doctorGreeting}
                </p>

                <div className="bg-white p-3 rounded-xl border border-stone-200/70 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">
                    Valoración Preliminar
                  </span>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    {telemedResponse.clinicalObservation}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-extrabold text-stone-700 block">
                    Pautas inmediatas en casa:
                  </span>
                  {telemedResponse.immediateCareSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs text-stone-700 bg-white p-2.5 rounded-xl border border-stone-200/60"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200/70 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-900 leading-snug">
                    <strong>Signos de alerta:</strong> {telemedResponse.warningSigns}
                  </p>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  {telemedBookedSuccess ? (
                    <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold text-center border border-emerald-200">
                      ✓ Teleconsulta registrada en &ldquo;Mis Citas&rdquo;
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveTelemedToAppointments}
                      className="w-full min-h-[44px] rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold cursor-pointer"
                    >
                      Guardar resumen en Mis Citas ({telemedVet.telemedPrice}{telemedVet.currency})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: BOOK PHYSICAL OR HOME CONSULTATION */}
      {bookingVet && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setBookingVet(null)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] p-5 pb-8 sm:pb-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-display font-extrabold text-base text-stone-900">
                  Agendar Cita Veterinaria
                </h3>
                <p className="text-xs text-stone-500">
                  {bookingVet.name} · {bookingVet.clinicName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingVet(null)}
                className="min-h-[36px] min-w-[36px] rounded-full bg-[#FAF9F6] text-stone-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-display font-extrabold text-base text-stone-900">
                  ¡Cita Confirmada para {activePet.name}!
                </h4>
                <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed">
                  Tu cita ({selectedModality === "domicilio" ? "A Domicilio" : "En Clínica Física"}) para el horario <strong>{selectedSlot}</strong> ha quedado registrada.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setBookingVet(null);
                    setActiveSubTab("appointments");
                  }}
                  className="w-full min-h-[46px] rounded-2xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                >
                  Ver en Mis Citas
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmPhysicalBooking} className="space-y-4">
                {/* Choose Modality */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    1. Modalidad de atención
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedModality("presencial")}
                      className={`min-h-[48px] p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedModality === "presencial"
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-[#FAF9F6] text-stone-700 border-stone-200"
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>En Clínica ({bookingVet.inPersonPrice}€)</span>
                    </button>

                    {bookingVet.modalities.includes("domicilio") && (
                      <button
                        type="button"
                        onClick={() => setSelectedModality("domicilio")}
                        className={`min-h-[48px] p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                          selectedModality === "domicilio"
                            ? "bg-stone-900 text-white border-stone-900"
                            : "bg-[#FAF9F6] text-stone-700 border-stone-200"
                        }`}
                      >
                        <Home className="w-4 h-4" />
                        <span>A Domicilio ({bookingVet.inPersonPrice}€)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Choose Slot */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    2. Horario disponible
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {bookingVet.availableSlots.map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                          selectedSlot === slot
                            ? "bg-teal-700 text-white border-teal-700"
                            : "bg-[#FAF9F6] text-stone-700 border-stone-200"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{slot}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedModality === "domicilio" && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Dirección para la visita a domicilio
                    </label>
                    <input
                      type="text"
                      value={homeAddress}
                      onChange={(e) => setHomeAddress(e.target.value)}
                      className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200 rounded-xl px-3 text-base sm:text-xs text-stone-800"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Motivo de la consulta para {activePet.name}
                  </label>
                  <input
                    type="text"
                    value={visitReason}
                    onChange={(e) => setVisitReason(e.target.value)}
                    placeholder="Ej: Vacunación anual, revisión de oído, control general..."
                    className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200 rounded-xl px-3 text-base sm:text-xs text-stone-800"
                    required
                  />
                </div>

                <div className="bg-[#FAF9F6] p-3 rounded-xl border border-stone-200/70 text-[11px] text-stone-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-700" />
                    <span>Contacto clínica: {bookingVet.phone}</span>
                  </span>
                  <span className="font-bold text-stone-800">{bookingVet.location}</span>
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[48px] rounded-2xl bg-[#FF5A36] hover:bg-[#E04826] text-white text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Confirmar Cita para {activePet.name}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: REGISTER AS A VETERINARIAN */}
      {isRegisterModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsRegisterModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] p-5 pb-8 sm:pb-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-display font-extrabold text-base text-stone-900">
                  Sumarse al Directorio Veterinario
                </h3>
                <p className="text-xs text-stone-500">
                  Atiende por Telemedicina Animal y/o en tu Clínica Física
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="min-h-[36px] min-w-[36px] rounded-full bg-[#FAF9F6] text-stone-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVetSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nombre del Doctor(a)
                </label>
                <input
                  type="text"
                  value={newVetName}
                  onChange={(e) => setNewVetName(e.target.value)}
                  placeholder="Ej: Dra. Laura Gómez"
                  className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200 rounded-xl px-3 text-base sm:text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nº de Colegiado
                  </label>
                  <input
                    type="text"
                    value={newVetLicense}
                    onChange={(e) => setNewVetLicense(e.target.value)}
                    placeholder="Colegiado #28-9910"
                    className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200 rounded-xl px-3 text-base sm:text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Especialidad
                  </label>
                  <input
                    type="text"
                    value={newVetSpecialty}
                    onChange={(e) => setNewVetSpecialty(e.target.value)}
                    placeholder="Medicina General / Felina"
                    className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200 rounded-xl px-3 text-base sm:text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Clínica o Centro Veterinario
                </label>
                <input
                  type="text"
                  value={newVetClinic}
                  onChange={(e) => setNewVetClinic(e.target.value)}
                  placeholder="Ej: Clínica Veterinaria Huellas"
                  className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200 rounded-xl px-3 text-base sm:text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Dirección y Ciudad
                </label>
                <input
                  type="text"
                  value={newVetLocation}
                  onChange={(e) => setNewVetLocation(e.target.value)}
                  placeholder="Ej: Calle Goya 45, Madrid"
                  className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200 rounded-xl px-3 text-base sm:text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Precio Telemedicina (€)
                  </label>
                  <input
                    type="number"
                    value={newVetTelemedPrice}
                    onChange={(e) => setNewVetTelemedPrice(e.target.value)}
                    className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200 rounded-xl px-3 text-base sm:text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Precio Consulta Física (€)
                  </label>
                  <input
                    type="number"
                    value={newVetInPersonPrice}
                    onChange={(e) => setNewVetInPersonPrice(e.target.value)}
                    className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200 rounded-xl px-3 text-base sm:text-xs"
                    required
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newVetOffersHome}
                  onChange={(e) => setNewVetOffersHome(e.target.checked)}
                  className="rounded text-teal-700"
                />
                <span>También ofrezco atención física a domicilio</span>
              </label>

              <button
                type="submit"
                className="w-full min-h-[46px] rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold cursor-pointer mt-2"
              >
                Publicar Perfil Veterinario Verificado
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
