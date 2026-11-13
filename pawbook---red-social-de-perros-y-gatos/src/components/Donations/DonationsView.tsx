import React, { useState } from "react";
import {
  DonationCampaign,
  DonationExpenseItem,
  DonationUpdate,
  PetProfile,
  UserDonationHistoryItem,
} from "../../types";
import {
  ShieldCheck,
  HandHeart,
  Stethoscope,
  CheckCircle2,
  Plus,
  X,
  Heart,
  Sparkles,
  QrCode,
  History,
  FileText,
  Upload,
  Copy,
  Check,
  Camera,
  ChevronRight,
} from "lucide-react";
import { playBark, playMeow } from "../../utils/soundSynthesizer";

interface DonationsViewProps {
  campaigns: DonationCampaign[];
  donationHistory: UserDonationHistoryItem[];
  activePet: PetProfile;
  userPawPoints: number;
  onDonate: (
    campaignId: string,
    amount: number,
    donorName: string,
    message: string,
    paymentMethodLabel: string
  ) => void;
  onCreateCampaign: (newCampaign: DonationCampaign) => void;
  onAddCampaignUpdate: (campaignId: string, update: DonationUpdate) => void;
}

const PRESET_AMOUNTS = [10, 25, 50, 100];

const PROCEDURE_STAGES: (
  | "Ingreso Clínico"
  | "En Procedimiento"
  | "Recuperación"
  | "¡Alta Médica!"
)[] = [
  "Ingreso Clínico",
  "En Procedimiento",
  "Recuperación",
  "¡Alta Médica!",
];

const SAMPLE_RESCUE_PHOTOS = [
  {
    label: "Perrito en clínica",
    url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=900",
  },
  {
    label: "Gatito rescatado",
    url: "https://images.unsplash.com/photo-1513360382564-850120167616?auto=format&fit=crop&q=80&w=900",
  },
  {
    label: "Abuelito en refugio",
    url: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=900",
  },
];

/**
 * Renders either the foundation's uploaded QR image or a crisp, high-contrast
 * scannable-style SVG QR matrix unique to the foundation's verification code.
 */
const FoundationQrDisplay: React.FC<{
  qrUrl?: string;
  seedCode: string;
  foundationName: string;
}> = ({ qrUrl, seedCode, foundationName }) => {
  if (qrUrl) {
    return (
      <img
        src={qrUrl}
        alt={`QR de ${foundationName}`}
        className="w-44 h-44 object-contain rounded-2xl border border-stone-200 bg-white p-2 mx-auto"
      />
    );
  }

  // Deterministic 13x13 QR pattern based on seedCode
  const size = 13;
  const cells: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  const isFinderArea = (r: number, c: number) => {
    const topLeft = r < 4 && c < 4;
    const topRight = r < 4 && c >= size - 4;
    const bottomLeft = r >= size - 4 && c < 4;
    return topLeft || topRight || bottomLeft;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isFinderArea(r, c)) continue;
      const charCode = seedCode.charCodeAt((r * size + c) % seedCode.length);
      cells[r][c] = (charCode + r * 7 + c * 13) % 2 === 0;
    }
  }

  return (
    <div className="w-44 h-44 rounded-2xl border border-stone-200 bg-white p-3 mx-auto flex flex-col items-center justify-center shadow-2xs">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full text-stone-900"
        shapeRendering="crispEdges"
      >
        {/* Finder Patterns (3 corners) */}
        <rect x="0" y="0" width="3" height="3" fill="currentColor" />
        <rect x="0.6" y="0.6" width="1.8" height="1.8" fill="white" />
        <rect x="1" y="1" width="1" height="1" fill="currentColor" />

        <rect x={size - 3} y="0" width="3" height="3" fill="currentColor" />
        <rect
          x={size - 2.4}
          y="0.6"
          width="1.8"
          height="1.8"
          fill="white"
        />
        <rect x={size - 2} y="1" width="1" height="1" fill="currentColor" />

        <rect x="0" y={size - 3} width="3" height="3" fill="currentColor" />
        <rect
          x="0.6"
          y={size - 2.4}
          width="1.8"
          height="1.8"
          fill="white"
        />
        <rect x="1" y={size - 2} width="1" height="1" fill="currentColor" />

        {/* Data Modules */}
        {cells.map((row, r) =>
          row.map((active, c) =>
            active ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width="0.9"
                height="0.9"
                fill="currentColor"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};

export const DonationsView: React.FC<DonationsViewProps> = ({
  campaigns,
  donationHistory,
  activePet,
  onDonate,
  onCreateCampaign,
  onAddCampaignUpdate,
}) => {
  // Primary mobile-first view switcher: 'explore' vs 'history'
  const [activeSubTab, setActiveSubTab] = useState<"explore" | "history">(
    "explore"
  );
  const [speciesFilter, setSpeciesFilter] = useState<"all" | "dog" | "cat">(
    "all"
  );

  // Active bottom sheets / modals
  const [inspectingCampaign, setInspectingCampaign] =
    useState<DonationCampaign | null>(null);
  const [inspectTab, setInspectTab] = useState<"bitacora" | "verificacion">(
    "bitacora"
  );
  const [donatingCampaign, setDonatingCampaign] =
    useState<DonationCampaign | null>(null);
  const [isProtocolOpen, setIsProtocolOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);

  // Donation Checkout & QR State
  const [selectedAmount, setSelectedAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<"qr" | "card">("qr");
  const [donorMessage, setDonorMessage] = useState<string>("");
  const [donationSuccessId, setDonationSuccessId] = useState<string | null>(
    null
  );
  const [copiedAlias, setCopiedAlias] = useState(false);

  // Add Progress Update State (inside Bitácora modal)
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [newUpdateStage, setNewUpdateStage] = useState<
    "Ingreso Clínico" | "En Procedimiento" | "Recuperación" | "¡Alta Médica!"
  >("Recuperación");
  const [newUpdateNote, setNewUpdateNote] = useState("");
  const [newUpdatePhoto, setNewUpdatePhoto] = useState("");

  // New Foundation Campaign Form State (with QR upload & Anti-Fraud Filter)
  const [animalName, setAnimalName] = useState("");
  const [species, setSpecies] = useState<"dog" | "cat">("dog");
  const [location, setLocation] = useState("Madrid, España");
  const [foundationName, setFoundationName] = useState("");
  const [shelterLegalId, setShelterLegalId] = useState("");
  const [foundationPaymentAlias, setFoundationPaymentAlias] = useState("");
  const [foundationQrPreview, setFoundationQrPreview] = useState<string>("");
  const [urgencyLevel, setUrgencyLevel] = useState<
    "Crítico" | "Tratamiento Activo" | "Alimento y Refugio"
  >("Tratamiento Activo");
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [imageUrl, setImageUrl] = useState(SAMPLE_RESCUE_PHOTOS[0].url);
  const [vetClinicName, setVetClinicName] = useState("");
  const [vetDoctorName, setVetDoctorName] = useState("");
  const [vetLicense, setVetLicense] = useState("");
  const [expense1Name, setExpense1Name] = useState("Cirugía / Tratamiento clínico");
  const [expense1Cost, setExpense1Cost] = useState("250");
  const [expense2Name, setExpense2Name] = useState("Hospitalización y medicación");
  const [expense2Cost, setExpense2Cost] = useState("120");
  const [hasAcceptedAuditFilter, setHasAcceptedAuditFilter] = useState(false);

  const dailyVerificationCode = "PAW-VER-2026-9482";

  const filteredCampaigns = campaigns.filter((c) => {
    if (speciesFilter !== "all" && c.species !== speciesFilter) return false;
    return true;
  });

  const userTotalDonated = donationHistory.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const handleOpenDonate = (campaign: DonationCampaign) => {
    setDonatingCampaign(campaign);
    setPaymentMode("qr");
    setSelectedAmount(25);
    setCustomAmount("");
    setDonorMessage(
      `¡Mucho ánimo para ${campaign.animalName}! De parte de ${activePet.name} 🐾`
    );
    setDonationSuccessId(null);
    setCopiedAlias(false);
  };

  const handleCopyAlias = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedAlias(true);
    setTimeout(() => setCopiedAlias(false), 2000);
  };

  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setFoundationQrPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmDonation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donatingCampaign) return;

    const finalAmount =
      customAmount && Number(customAmount) > 0
        ? Number(customAmount)
        : selectedAmount;

    if (!finalAmount || finalAmount <= 0) return;

    onDonate(
      donatingCampaign.id,
      finalAmount,
      `Familia de ${activePet.name}`,
      donorMessage.trim(),
      paymentMode === "qr" ? "Código QR Fundación" : "Tarjeta / App"
    );

    if (donatingCampaign.species === "dog") {
      playBark("happy");
    } else {
      playMeow("cute");
    }

    setDonationSuccessId(donatingCampaign.id);
  };

  const handleSaveNewUpdate = (e: React.FormEvent, campaignId: string) => {
    e.preventDefault();
    if (!newUpdateNote.trim()) return;

    onAddCampaignUpdate(campaignId, {
      id: `up-${Date.now()}`,
      date: "Ahora mismo",
      stage: newUpdateStage,
      note: newUpdateNote.trim(),
      photoUrl: newUpdatePhoto.trim() || undefined,
    });

    setNewUpdateNote("");
    setNewUpdatePhoto("");
    setIsAddingUpdate(false);
  };

  const handlePublishCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !animalName.trim() ||
      !foundationName.trim() ||
      !vetClinicName.trim() ||
      !vetLicense.trim() ||
      !hasAcceptedAuditFilter
    ) {
      return;
    }

    const cost1 = Math.max(10, Number(expense1Cost) || 150);
    const cost2 = Math.max(0, Number(expense2Cost) || 0);
    const expenses: DonationExpenseItem[] = [
      { item: expense1Name.trim() || "Atención veterinaria", cost: cost1 },
    ];
    if (cost2 > 0) {
      expenses.push({
        item: expense2Name.trim() || "Medicación y recuperación",
        cost: cost2,
      });
    }
    const totalGoal = expenses.reduce((sum, item) => sum + item.cost, 0);

    const newCampaign: DonationCampaign = {
      id: `don-${Date.now()}`,
      animalName: animalName.trim(),
      species,
      breed: "Rescatado Verificado",
      age: "En revisión",
      location: location.trim() || "España",
      foundationName: foundationName.trim(),
      foundationAvatar: activePet.avatar,
      foundationQrUrl: foundationQrPreview || undefined,
      foundationPaymentAlias:
        foundationPaymentAlias.trim() ||
        `Cuenta Verificada ${foundationName.trim()}`,
      currentStage: "Ingreso Clínico",
      urgencyLevel,
      title:
        title.trim() ||
        `Tratamiento médico verificado para ${animalName.trim()}`,
      story:
        story.trim() ||
        `${animalName.trim()} está bajo el cuidado de ${foundationName.trim()} con orden veterinaria validada.`,
      imageUrl: imageUrl.trim() || SAMPLE_RESCUE_PHOTOS[0].url,
      goalAmount: totalGoal,
      raisedAmount: 0,
      currency: "€",
      donorsCount: 0,
      createdAt: "Verificado hoy",
      verification: {
        verificationCode: dailyVerificationCode,
        shelterLegalId:
          shelterLegalId.trim() || "Registro Protectora Verificado",
        vetClinicName: vetClinicName.trim(),
        vetDoctorName: vetDoctorName.trim() || "Equipo Médico Colegiado",
        vetLicense: vetLicense.trim(),
        vetPhoneVerified: "Auditado por PawBook",
        liveVideoAuditStatus:
          "Videollamada en directo con código único aprobada",
        directClinicPayout: true,
        verifiedAt: "Auditado hoy por PawBook",
        medicalOrderSummary: `${expense1Name} + ${expense2Name}`,
        proofPhotoUrl: imageUrl.trim() || SAMPLE_RESCUE_PHOTOS[0].url,
        expenseBreakdown: expenses,
      },
      recentDonors: [],
      updates: [
        {
          id: `up-${Date.now()}`,
          date: "Hoy",
          stage: "Ingreso Clínico",
          note: `Caso verificado por PawBook. ${animalName.trim()} inició su atención en ${vetClinicName.trim()}.`,
          photoUrl: imageUrl.trim() || SAMPLE_RESCUE_PHOTOS[0].url,
        },
      ],
    };

    onCreateCampaign(newCampaign);
    setIsPublishOpen(false);
    setAnimalName("");
    setTitle("");
    setStory("");
    setFoundationQrPreview("");
    setHasAcceptedAuditFilter(false);
  };

  const currentInspected = inspectingCampaign
    ? campaigns.find((c) => c.id === inspectingCampaign.id) ||
      inspectingCampaign
    : null;

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-0 py-3.5 sm:py-5 space-y-4">
      {/* Clean Mobile-First Header & Segmented Navigation */}
      <div className="bg-white rounded-[24px] p-3.5 sm:p-4 border border-stone-200/80 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-display font-extrabold text-lg sm:text-xl text-stone-900 tracking-tight">
              Donaciones Reales
            </h1>
            <button
              type="button"
              onClick={() => setIsProtocolOpen(true)}
              className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mt-0.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
              <span>Filtro de existencia real · Ver cómo verificamos</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPublishOpen(true)}
            className="min-h-[40px] px-3.5 py-2 rounded-2xl bg-stone-900 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Fundación</span>
          </button>
        </div>

        {/* Segmented Control: Explorar Casos vs Mi Historial y Bitácora */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#FAF9F6] border border-stone-200/70">
          <button
            type="button"
            onClick={() => setActiveSubTab("explore")}
            className={`min-h-[40px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === "explore"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <HandHeart className="w-4 h-4 text-[#FF5A36]" />
            <span>Casos ({campaigns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("history")}
            className={`min-h-[40px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === "history"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <History className="w-4 h-4 text-emerald-700" />
            <span>Mis Donaciones ({donationHistory.length})</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: EXPLORAR CASOS (CLEAN, UNCLUTTERED MOBILE FEED)
         ===================================================================== */}
      {activeSubTab === "explore" && (
        <>
          {/* Minimal 3-Chip Species Filter */}
          <div className="flex items-center gap-2">
            {(
              [
                { id: "all", label: "Todos" },
                { id: "dog", label: "🐕 Perritos" },
                { id: "cat", label: "🐈 Gatitos" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSpeciesFilter(tab.id)}
                className={`min-h-[38px] px-4 py-1.5 rounded-2xl text-xs font-bold transition-colors cursor-pointer ${
                  speciesFilter === tab.id
                    ? "bg-stone-900 text-white"
                    : "bg-white border border-stone-200/80 text-stone-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Clean Single-Column Feed Cards */}
          <div className="space-y-4">
            {filteredCampaigns.map((campaign) => {
              const percent = Math.min(
                100,
                Math.round((campaign.raisedAmount / campaign.goalAmount) * 100)
              );
              const latestUpdate = campaign.updates?.[0];

              return (
                <article
                  key={campaign.id}
                  className="bg-white rounded-[26px] border border-stone-200/80 overflow-hidden"
                >
                  {/* Animal Photo */}
                  <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                    <img
                      src={campaign.imageUrl}
                      alt={campaign.animalName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-transparent to-transparent" />

                    {/* Top Left: Verified Existence Badge */}
                    <button
                      type="button"
                      onClick={() => {
                        setInspectingCampaign(campaign);
                        setInspectTab("verificacion");
                      }}
                      className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-emerald-700/95 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Existencia Verificada</span>
                    </button>

                    {/* Top Right: Current Medical Stage */}
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-white/95 text-stone-900 text-[11px] font-bold shadow-xs">
                      {campaign.currentStage || campaign.urgencyLevel}
                    </span>

                    {/* Bottom Name & Foundation */}
                    <div className="absolute bottom-3 left-3.5 right-3.5 text-white">
                      <h2 className="font-display font-extrabold text-lg leading-tight">
                        {campaign.species === "dog" ? "🐕" : "🐈"}{" "}
                        {campaign.animalName}
                      </h2>
                      <p className="text-xs text-stone-200 truncate">
                        {campaign.foundationName} ·{" "}
                        {campaign.verification.vetClinicName}
                      </p>
                    </div>
                  </div>

                  {/* Clean Card Body */}
                  <div className="p-4 space-y-3.5">
                    <p className="font-display font-bold text-sm text-stone-900 leading-snug">
                      {campaign.title}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-xs tabular-nums">
                        <div>
                          <span className="font-display font-extrabold text-base text-stone-900">
                            {campaign.raisedAmount}
                            {campaign.currency}
                          </span>{" "}
                          <span className="text-stone-500">
                            de {campaign.goalAmount}
                            {campaign.currency}
                          </span>
                        </div>
                        <span className="text-stone-500 font-semibold">
                          {campaign.donorsCount} donantes · {percent}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F3F1EC] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Latest Bitácora Snippet (Emotional Connection) */}
                    {latestUpdate && (
                      <button
                        type="button"
                        onClick={() => {
                          setInspectingCampaign(campaign);
                          setInspectTab("bitacora");
                        }}
                        className="w-full p-3 rounded-2xl bg-[#FAF9F6] hover:bg-[#F3F1EC] border border-stone-200/70 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-emerald-700 block">
                            Bitácora · {latestUpdate.date}
                          </span>
                          <p className="text-xs text-stone-700 truncate mt-0.5">
                            {latestUpdate.note}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                      </button>
                    )}

                    {/* Primary Thumb Actions */}
                    <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setInspectingCampaign(campaign);
                          setInspectTab("bitacora");
                        }}
                        className="min-h-[46px] px-3 py-2 rounded-2xl bg-[#FAF9F6] hover:bg-[#F3F1EC] border border-stone-200/80 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <FileText className="w-4 h-4 text-stone-600" />
                        <span>Bitácora y Filtro</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDonate(campaign)}
                        className="min-h-[46px] px-3 py-2 rounded-2xl bg-[#FF5A36] hover:bg-[#E84C2B] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <QrCode className="w-4 h-4 stroke-[2.3]" />
                        <span>Donar (QR)</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* =====================================================================
          TAB 2: MIS DONACIONES Y BITÁCORA DE EVOLUCIÓN DEL ANIMALITO
         ===================================================================== */}
      {activeSubTab === "history" && (
        <div className="space-y-4">
          {/* Impact Summary Card */}
          <div className="bg-white rounded-[24px] p-4 border border-stone-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                Tu huella solidaria
              </span>
              <p className="font-display font-extrabold text-2xl text-stone-900 tabular-nums mt-0.5">
                {userTotalDonated}€{" "}
                <span className="text-xs font-semibold text-stone-500">
                  donados en {donationHistory.length} aportes
                </span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Heart className="w-5 h-5 fill-emerald-600 text-emerald-600" />
            </div>
          </div>

          {donationHistory.length === 0 ? (
            <div className="bg-white rounded-[24px] p-8 text-center border border-stone-200/80 space-y-3">
              <p className="font-display font-bold text-sm text-stone-800">
                Aún no has registrado donaciones
              </p>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Cuando dones a un perrito o gatito, aquí verás tu recibo y la
                bitácora fotográfica de cómo avanza su recuperación.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab("explore")}
                className="min-h-[42px] px-4 py-2 rounded-2xl bg-[#FF5A36] text-white text-xs font-bold cursor-pointer"
              >
                Ver casos verificados
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {donationHistory.map((item) => {
                const linkedCampaign = campaigns.find(
                  (c) => c.id === item.campaignId
                );
                const updates = linkedCampaign?.updates || [];
                const activeStage =
                  linkedCampaign?.currentStage || "En Procedimiento";
                const stageIdx = PROCEDURE_STAGES.indexOf(activeStage);

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-[24px] p-4 border border-stone-200/80 space-y-3.5"
                  >
                    {/* Donation Receipt Header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.animalImage}
                          alt={item.animalName}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-2xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="font-display font-extrabold text-sm text-stone-900 truncate">
                            {item.species === "dog" ? "🐕" : "🐈"}{" "}
                            {item.animalName}
                          </h3>
                          <p className="text-[11px] text-stone-500 truncate">
                            {item.foundationName} · {item.date}
                          </p>
                          <span className="text-[10px] font-mono text-stone-400">
                            Recibo {item.receiptCode} · {item.paymentMethod}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-display font-extrabold text-base text-emerald-700 tabular-nums block">
                          {item.amount}
                          {item.currency}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                          Verificado
                        </span>
                      </div>
                    </div>

                    {/* Visual 4-Step Procedure Tracker */}
                    <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-stone-200/70 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-800">
                          ¿Qué pasó con {item.animalName}?
                        </span>
                        <span className="font-bold text-emerald-700">
                          {activeStage}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {PROCEDURE_STAGES.map((st, idx) => {
                          const completed = idx <= stageIdx;
                          return (
                            <div key={st} className="space-y-1">
                              <div
                                className={`h-1.5 rounded-full ${
                                  completed ? "bg-emerald-600" : "bg-stone-200"
                                }`}
                              />
                              <span
                                className={`block text-[10px] leading-tight truncate ${
                                  completed
                                    ? "font-bold text-stone-800"
                                    : "text-stone-400"
                                }`}
                              >
                                {st}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Latest Update with Photo from the Procedure */}
                      {updates.length > 0 && (
                        <div className="pt-2 border-t border-stone-200/60 flex items-start gap-2.5">
                          {updates[0].photoUrl && (
                            <img
                              src={updates[0].photoUrl}
                              alt="Avance clínico"
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-xl object-cover shrink-0"
                            />
                          )}
                          <div className="text-xs min-w-0">
                            <span className="text-[11px] font-bold text-stone-900 block">
                              Último reporte ({updates[0].date}):
                            </span>
                            <p className="text-stone-600 leading-snug mt-0.5">
                              {updates[0].note}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {linkedCampaign && (
                      <button
                        type="button"
                        onClick={() => {
                          setInspectingCampaign(linkedCampaign);
                          setInspectTab("bitacora");
                        }}
                        className="w-full min-h-[40px] rounded-xl bg-[#FAF9F6] hover:bg-[#F3F1EC] text-stone-800 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Ver bitácora completa y facturas</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL 1: DONATE WITH FOUNDATION QR CODE (OR CARD/APP)
         ===================================================================== */}
      {donatingCampaign && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setDonatingCampaign(null)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-3xl max-h-[92vh] overflow-y-auto p-5 space-y-4 animate-sheet-up shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto sm:hidden" />

            {donationSuccessId === donatingCampaign.id ? (
              <div className="py-4 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 stroke-[2.4]" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-700 uppercase">
                    ¡Donación Registrada en tu Historial!
                  </span>
                  <h3 className="font-display font-extrabold text-xl text-stone-900">
                    Gracias por ayudar a {donatingCampaign.animalName}
                  </h3>
                  <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed">
                    En la pestaña <strong>«Mis Donaciones»</strong> podrás
                    seguir paso a paso la bitácora fotográfica de su
                    procedimiento en{" "}
                    <strong>{donatingCampaign.verification.vetClinicName}</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-stone-200/80 inline-flex items-center gap-2 text-xs font-bold text-[#FF5A36]">
                  <Sparkles className="w-4 h-4" />
                  <span>+30 PawPoints solidarios para {activePet.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDonatingCampaign(null);
                      setActiveSubTab("history");
                    }}
                    className="min-h-[46px] rounded-2xl bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Ver en Mis Donaciones
                  </button>
                  <button
                    type="button"
                    onClick={() => setDonatingCampaign(null)}
                    className="min-h-[46px] rounded-2xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmDonation} className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={donatingCampaign.imageUrl}
                      alt={donatingCampaign.animalName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-2xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display font-extrabold text-base text-stone-900 truncate">
                        Donar a {donatingCampaign.animalName}
                      </h3>
                      <p className="text-[11px] text-emerald-700 font-semibold truncate">
                        ✓ {donatingCampaign.foundationName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDonatingCampaign(null)}
                    className="min-h-[36px] min-w-[36px] rounded-full bg-[#FAF9F6] text-stone-500 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Payment Mode Selector: Foundation QR (Default) vs Direct */}
                <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#FAF9F6] border border-stone-200/70">
                  <button
                    type="button"
                    onClick={() => setPaymentMode("qr")}
                    className={`min-h-[38px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMode === "qr"
                        ? "bg-stone-900 text-white"
                        : "text-stone-600"
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Código QR Fundación</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode("card")}
                    className={`min-h-[38px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMode === "card"
                        ? "bg-stone-900 text-white"
                        : "text-stone-600"
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>Pago Rápido App</span>
                  </button>
                </div>

                {/* Official Foundation QR Box */}
                {paymentMode === "qr" && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-stone-200/80 text-center space-y-2.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>QR Oficial subido por {donatingCampaign.foundationName}</span>
                    </span>

                    <FoundationQrDisplay
                      qrUrl={donatingCampaign.foundationQrUrl}
                      seedCode={donatingCampaign.verification.verificationCode}
                      foundationName={donatingCampaign.foundationName}
                    />

                    <p className="text-[11px] text-stone-500 leading-snug">
                      Escanea desde la app de tu banco o billetera móvil.
                    </p>

                    {donatingCampaign.foundationPaymentAlias && (
                      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-stone-200/80 text-[11px]">
                        <span className="font-mono text-stone-700 truncate">
                          {donatingCampaign.foundationPaymentAlias}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyAlias(
                              donatingCampaign.foundationPaymentAlias || ""
                            )
                          }
                          className="text-emerald-700 font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {copiedAlias ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Amount Selection to Record in History */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-700">
                    Monto de tu aporte ({donatingCampaign.currency}) para tu
                    registro
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_AMOUNTS.map((amt) => {
                      const isSelected = !customAmount && selectedAmount === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setSelectedAmount(amt);
                            setCustomAmount("");
                          }}
                          className={`min-h-[42px] rounded-xl font-display font-extrabold text-sm tabular-nums cursor-pointer ${
                            isSelected
                              ? "bg-stone-900 text-white"
                              : "bg-[#FAF9F6] border border-stone-200/80 text-stone-800"
                          }`}
                        >
                          {amt}
                          {donatingCampaign.currency}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Otro monto (ej. 15)"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-stone-200/80 text-base sm:text-xs text-stone-900"
                  />
                </div>

                {/* Supportive Message */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Mensaje de apoyo (opcional)
                  </label>
                  <input
                    type="text"
                    value={donorMessage}
                    onChange={(e) => setDonorMessage(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-stone-200/80 text-base sm:text-xs text-stone-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[48px] rounded-2xl bg-[#FF5A36] hover:bg-[#E84C2B] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#FF5A36]/20 cursor-pointer active:scale-98 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.4]" />
                  <span>
                    Ya doné{" "}
                    {customAmount && Number(customAmount) > 0
                      ? customAmount
                      : selectedAmount}
                    {donatingCampaign.currency} · Registrar y seguir bitácora
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: BITÁCORA DEL PROCEDIMIENTO Y CERTIFICADO DE VERIFICACIÓN
         ===================================================================== */}
      {currentInspected && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setInspectingCampaign(null)}
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 animate-sheet-up shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h2 className="font-display font-extrabold text-lg text-stone-900">
                  {currentInspected.species === "dog" ? "🐕" : "🐈"}{" "}
                  {currentInspected.animalName}
                </h2>
                <p className="text-xs text-stone-500">
                  {currentInspected.foundationName} · Cód:{" "}
                  <span className="font-mono font-bold text-stone-700">
                    {currentInspected.verification.verificationCode}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingCampaign(null)}
                className="min-h-[36px] min-w-[36px] rounded-full bg-[#FAF9F6] text-stone-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inner Sub-Tabs: Bitácora de Evolución vs Facturas y Filtro */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#FAF9F6] border border-stone-200/70">
              <button
                type="button"
                onClick={() => setInspectTab("bitacora")}
                className={`min-h-[38px] rounded-xl text-xs font-bold cursor-pointer ${
                  inspectTab === "bitacora"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-500"
                }`}
              >
                Bitácora del Procedimiento
              </button>
              <button
                type="button"
                onClick={() => setInspectTab("verificacion")}
                className={`min-h-[38px] rounded-xl text-xs font-bold cursor-pointer ${
                  inspectTab === "verificacion"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-500"
                }`}
              >
                Filtro y Facturas
              </button>
            </div>

            {inspectTab === "bitacora" ? (
              <div className="space-y-4">
                {/* 4-Stage Visual Progress */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-950">
                      Estado actual del procedimiento:
                    </span>
                    <span className="font-extrabold text-emerald-700">
                      {currentInspected.currentStage || "En Procedimiento"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PROCEDURE_STAGES.map((st, idx) => {
                      const currentIdx = PROCEDURE_STAGES.indexOf(
                        currentInspected.currentStage || "En Procedimiento"
                      );
                      const done = idx <= currentIdx;
                      return (
                        <div key={st} className="space-y-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              done ? "bg-emerald-600" : "bg-emerald-200/60"
                            }`}
                          />
                          <span
                            className={`block text-[10px] truncate ${
                              done
                                ? "font-bold text-emerald-950"
                                : "text-stone-400"
                            }`}
                          >
                            {st}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Timeline of Procedure Updates */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-stone-500">
                      Avances para los donantes
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsAddingUpdate((prev) => !prev)}
                      className="text-xs font-bold text-[#FF5A36] cursor-pointer"
                    >
                      {isAddingUpdate
                        ? "Cancelar"
                        : "+ Subir avance (Fundación)"}
                    </button>
                  </div>

                  {isAddingUpdate && (
                    <form
                      onSubmit={(e) =>
                        handleSaveNewUpdate(e, currentInspected.id)
                      }
                      className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-stone-200 space-y-2.5"
                    >
                      <select
                        value={newUpdateStage}
                        onChange={(e) =>
                          setNewUpdateStage(
                            e.target.value as
                              | "Ingreso Clínico"
                              | "En Procedimiento"
                              | "Recuperación"
                              | "¡Alta Médica!"
                          )
                        }
                        className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-base sm:text-xs font-bold text-stone-800"
                      >
                        {PROCEDURE_STAGES.map((st) => (
                          <option key={st} value={st}>
                            Etapa: {st}
                          </option>
                        ))}
                      </select>
                      <textarea
                        rows={2}
                        required
                        value={newUpdateNote}
                        onChange={(e) => setNewUpdateNote(e.target.value)}
                        placeholder="Cuenta a los donantes cómo salió la cirugía o cómo sigue hoy..."
                        className="w-full p-2.5 rounded-xl bg-white border border-stone-200 text-base sm:text-xs"
                      />
                      <button
                        type="submit"
                        className="w-full min-h-[40px] rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                      >
                        Publicar en la bitácora
                      </button>
                    </form>
                  )}

                  <div className="space-y-3 border-l-2 border-emerald-200 ml-2 pl-3.5">
                    {(currentInspected.updates || []).map((u, idx) => (
                      <div key={u.id || idx} className="space-y-1.5 relative">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 absolute -left-[19px] top-1 ring-4 ring-white" />
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-stone-900">
                            {u.date}
                          </span>
                          {u.stage && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800">
                              {u.stage}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed">
                          {u.note}
                        </p>
                        {u.photoUrl && (
                          <img
                            src={u.photoUrl}
                            alt="Evidencia del procedimiento"
                            referrerPolicy="no-referrer"
                            className="w-full max-h-44 object-cover rounded-2xl border border-stone-200/80 mt-1"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Tab 2 inside Modal: Verification & Invoices */
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-stone-200/80 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <Stethoscope className="w-4 h-4 shrink-0" />
                    <span>
                      {currentInspected.verification.vetClinicName} ·{" "}
                      {currentInspected.verification.vetDoctorName}
                    </span>
                  </div>
                  <p className="text-stone-600">
                    {currentInspected.verification.vetLicense} ·{" "}
                    {currentInspected.verification.liveVideoAuditStatus}
                  </p>
                </div>

                {/* Itemized Invoices */}
                <div className="rounded-2xl border border-stone-200/80 divide-y divide-stone-100 overflow-hidden">
                  {currentInspected.verification.expenseBreakdown.map(
                    (item, idx) => (
                      <div
                        key={idx}
                        className="px-3.5 py-2.5 flex items-center justify-between text-xs bg-white"
                      >
                        <span className="text-stone-700">{item.item}</span>
                        <span className="font-bold text-stone-900 tabular-nums">
                          {item.cost}
                          {currentInspected.currency}
                        </span>
                      </div>
                    )
                  )}
                  <div className="px-3.5 py-2.5 flex items-center justify-between text-xs bg-[#FAF9F6] font-bold">
                    <span className="text-stone-900">Meta Total Auditada</span>
                    <span className="text-emerald-700 tabular-nums">
                      {currentInspected.goalAmount}
                      {currentInspected.currency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const target = currentInspected;
                setInspectingCampaign(null);
                handleOpenDonate(target);
              }}
              className="w-full min-h-[48px] rounded-2xl bg-[#FF5A36] hover:bg-[#E84C2B] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Donar con QR a {currentInspected.animalName}</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: ANTI-FRAUD PROTOCOL EXPLANATION
         ===================================================================== */}
      {isProtocolOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsProtocolOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-3xl p-5 space-y-4 animate-sheet-up shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-display font-extrabold text-base text-stone-900">
                Filtro de Existencia Real PawBook
              </h3>
              <button
                type="button"
                onClick={() => setIsProtocolOpen(false)}
                className="min-h-[34px] min-w-[34px] rounded-full bg-[#FAF9F6] text-stone-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-stone-600 leading-relaxed">
              <p>
                <strong className="text-stone-900">1. Videollamada en vivo:</strong>{" "}
                Verificamos que el animalito existe junto a un código único del
                día antes de publicar.
              </p>
              <p>
                <strong className="text-stone-900">
                  2. Clínica Veterinaria:
                </strong>{" "}
                Validamos el número de colegiado del veterinario y el
                presupuesto médico.
              </p>
              <p>
                <strong className="text-stone-900">
                  3. Bitácora post-donación:
                </strong>{" "}
                La fundación sube fotos de cada etapa del procedimiento para
                agradecer e informar a los donantes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsProtocolOpen(false)}
              className="w-full min-h-[44px] rounded-2xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: PUBLISH FOUNDATION CASE (WITH QR UPLOAD & VERIFICATION)
         ===================================================================== */}
      {isPublishOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsPublishOpen(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl max-h-[92vh] overflow-y-auto p-5 space-y-4 animate-sheet-up shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-700">
                  FILTRO PARA FUNDACIONES Y CASAS DE AYUDA
                </span>
                <h3 className="font-display font-extrabold text-base text-stone-900">
                  Publicar animalito y subir QR
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishOpen(false)}
                className="min-h-[36px] min-w-[36px] rounded-full bg-[#FAF9F6] text-stone-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishCampaign} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={animalName}
                  onChange={(e) => setAnimalName(e.target.value)}
                  placeholder="Nombre del animalito *"
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-stone-200 text-base sm:text-xs"
                />
                <select
                  value={species}
                  onChange={(e) => setSpecies(e.target.value as "dog" | "cat")}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-[#FAF9F6] border border-stone-200 text-base sm:text-xs"
                >
                  <option value="dog">🐕 Perrito</option>
                  <option value="cat">🐈 Gatito</option>
                </select>
              </div>

              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Procedimiento que necesita (ej. Cirugía de pata) *"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-stone-200 text-base sm:text-xs"
              />

              {/* QR Code Upload Section for Foundation */}
              <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#FF5A36]" />
                    <span>Código QR de la Fundación para recibir donaciones</span>
                  </span>
                </div>

                <label className="flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 rounded-xl bg-white border border-dashed border-stone-300 text-xs font-bold text-stone-700 cursor-pointer hover:border-[#FF5A36]">
                  <Upload className="w-4 h-4 text-[#FF5A36]" />
                  <span>
                    {foundationQrPreview
                      ? "✓ Imagen QR cargada (Toca para cambiar)"
                      : "Subir imagen de tu QR (Nequi / Bizum / Banco)"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrFileUpload}
                    className="hidden"
                  />
                </label>

                {foundationQrPreview && (
                  <img
                    src={foundationQrPreview}
                    alt="Vista previa QR"
                    className="w-28 h-28 object-contain rounded-xl border border-stone-200 bg-white p-1.5 mx-auto"
                  />
                )}

                <input
                  type="text"
                  value={foundationPaymentAlias}
                  onChange={(e) => setFoundationPaymentAlias(e.target.value)}
                  placeholder="Número de cuenta o llave junto al QR (opcional)"
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-base sm:text-xs"
                />
              </div>

              {/* Mandatory Veterinary & Shelter Verification */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2.5">
                <span className="text-xs font-bold text-emerald-950 block">
                  Filtro de Existencia Real (Código hoy: {dailyVerificationCode})
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={foundationName}
                    onChange={(e) => setFoundationName(e.target.value)}
                    placeholder="Nombre Fundación *"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-base sm:text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={shelterLegalId}
                    onChange={(e) => setShelterLegalId(e.target.value)}
                    placeholder="NIT / CIF Oficial *"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-base sm:text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={vetClinicName}
                    onChange={(e) => setVetClinicName(e.target.value)}
                    placeholder="Clínica Veterinaria *"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-base sm:text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={vetLicense}
                    onChange={(e) => setVetLicense(e.target.value)}
                    placeholder="Nº Colegiado Vet *"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-base sm:text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="10"
                    value={expense1Cost}
                    onChange={(e) => setExpense1Cost(e.target.value)}
                    placeholder="Costo cirugía (€)"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-base sm:text-xs font-bold"
                  />
                  <input
                    type="number"
                    min="0"
                    value={expense2Cost}
                    onChange={(e) => setExpense2Cost(e.target.value)}
                    placeholder="Costo medicación (€)"
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-base sm:text-xs font-bold"
                  />
                </div>

                <label className="flex items-start gap-2 pt-1 cursor-pointer text-[11px] text-emerald-950">
                  <input
                    type="checkbox"
                    required
                    checked={hasAcceptedAuditFilter}
                    onChange={(e) =>
                      setHasAcceptedAuditFilter(e.target.checked)
                    }
                    className="mt-0.5 w-4 h-4 accent-emerald-700"
                  />
                  <span>
                    Confirmo la existencia del animalito con el código{" "}
                    <strong>{dailyVerificationCode}</strong> y me comprometo a
                    subir avances en la bitácora para los donantes.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-2xl bg-emerald-700 text-white font-bold text-sm cursor-pointer"
              >
                Publicar caso verificado con QR
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
