export type Species = "dog" | "cat";

export type MoodTag = 
  | "Juguetón 🎾"
  | "Perezoso 😴"
  | "Drama Total 🎭"
  | "Modo Guardián 🛡️"
  | "Comilón 🥩"
  | "Explorador 🧭"
  | "Cazador de Láser 🎯"
  | "Amistad Incondicional 🐶❤️🐱";

export interface PetProfile {
  id: string;
  name: string;
  species: Species;
  breed: string;
  avatar: string;
  coverImage?: string;
  age: string;
  gender: "macho" | "hembra";
  bio: string;
  location: string;
  favoriteToy: string;
  favoriteTreat: string;
  personality: string[];
  badges: string[];
  followersCount: number;
  followingCount: number;
  isOwner?: boolean;
}

export interface ReactionCounts {
  paws: number;   // 🐾
  bones: number;  // 🦴 (Dogs)
  fish: number;   // 🐟 (Cats)
  hearts: number; // ❤️
}

export type ReactionType = "paws" | "bones" | "fish" | "hearts";

export interface Comment {
  id: string;
  petName: string;
  petAvatar: string;
  species: Species;
  content: string;
  timestamp: string;
  likes: number;
}

export interface Post {
  id: string;
  petId: string;
  petName: string;
  petAvatar: string;
  species: Species;
  breed: string;
  timestamp: string;
  location?: string;
  mood?: MoodTag;
  imageUrl?: string;
  filterOverlay?: string;
  filterName?: string;
  photoFilterStyle?: string;
  caption: string;
  reactions: ReactionCounts;
  userReaction?: ReactionType;
  comments: Comment[];
  isSaved?: boolean;
}

export interface PlaydateCandidate {
  id: string;
  name: string;
  species: Species;
  breed: string;
  avatar: string;
  images: string[];
  age: string;
  distance: string;
  energyLevel: "Tranquilo" | "Moderado" | "Hiperactivo";
  size: "Pequeño" | "Mediano" | "Grande";
  bio: string;
  favoriteActivity: string;
  matched?: boolean;
  mapX?: number; // relative percentage X on radar map (10 - 90)
  mapY?: number; // relative percentage Y on radar map (10 - 90)
  locationName?: string; // e.g. "Parque del Retiro - Pipican Norte"
}

export interface AdoptionPet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  avatar: string;
  images: string[];
  age: string;
  gender: "Macho" | "Hembra";
  city: string;
  shelterName: string;
  healthBadges: string[]; // e.g. "Vacunado", "Esterilizado", "Desparasitado"
  description: string;
  urgency: "Normal" | "Urgente" | "Hogar Temporal";
  contactEmail?: string;
  contactPhone?: string;
}

export interface AITranslationResult {
  translation: string;
  acousticTranscription?: string;
  whatImDoing?: string;
  whatIThinkOfYou?: string;
  emotion: string;
  subtext: string;
  demandLevel: string;
  adviceForHuman: string;
}

export interface FrequentPetSound {
  id: string;
  petId: string;
  petName: string;
  species: Species;
  title: string;
  acousticTranscription: string;
  context: string;
  whatItMeans: string;
  whatPetThinksOfOwner: string;
  durationSec: number;
  createdAt: string;
}

export interface PetConversationMessage {
  id: string;
  sender: "owner" | "pet";
  text: string;
  acousticSound?: string;
  whatImDoing?: string;
  whatIThinkOfYou?: string;
  timestamp: string;
}

export type VetModality = "telemedicina" | "presencial" | "domicilio";

export interface VetProfessional {
  id: string;
  name: string;
  specialty: string;
  clinicName: string;
  avatar: string;
  licenseNumber: string;
  rating: number;
  reviewsCount: number;
  location: string;
  distance: string;
  modalities: VetModality[];
  speciesServed: Species[];
  telemedPrice: number;
  inPersonPrice: number;
  currency: string;
  isAvailableNow: boolean;
  nextAvailableSlot: string;
  availableSlots: string[];
  bio: string;
  phone: string;
}

export interface VetAppointment {
  id: string;
  vetId: string;
  vetName: string;
  vetAvatar: string;
  vetSpecialty: string;
  clinicName: string;
  petName: string;
  petSpecies: Species;
  modality: VetModality;
  date: string;
  time: string;
  reason: string;
  price: number;
  currency: string;
  status: "Confirmada" | "Completada";
  locationAddress: string;
}

export interface AIAnalysisResult {
  archetype: string;
  estimatedBreedMix: string[];
  superpowers: string[];
  kryptonite: string;
  compatibility: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: string;
  currentCount: number;
  targetCount: number;
  isCompleted: boolean;
  category: "feed" | "social" | "ai" | "sound" | "market";
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  badgeIcon: string;
  unlocked: boolean;
  unlockedAt?: string;
  category: "general" | "social" | "ai" | "market";
}

export interface UserGamificationState {
  pawPoints: number;
  streakDays: number;
  lastActiveDate: string;
  level: number;
  levelTitle: string;
  completedChallengesCount: number;
  unlockedBadges: string[];
}


export type ItemCategory = 
  | "Juguetes" 
  | "Comida y Premios" 
  | "Accesorios y Ropa" 
  | "Camas y Casas" 
  | "Higiene y Salud" 
  | "Otros";

export type ItemCondition = "Nuevo" | "Como nuevo" | "Buen estado";

export interface MarketplaceItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  category: ItemCategory;
  condition: ItemCondition;
  petSpecies: "dog" | "cat" | "both";
  imageUrl: string;
  description: string;
  sellerName: string;
  sellerPetName?: string;
  sellerAvatar: string;
  sellerContactPhone: string;
  sellerContactEmail?: string;
  location: string;
  isSold?: boolean;
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
  isUserOwner?: boolean;
}

export interface DonationExpenseItem {
  item: string;
  cost: number;
}

export interface DonationRecord {
  id: string;
  donorName: string;
  petName?: string;
  amount: number;
  message?: string;
  timestamp: string;
}

export interface DonationVerification {
  verificationCode: string;
  shelterLegalId: string;
  vetClinicName: string;
  vetDoctorName: string;
  vetLicense: string;
  vetPhoneVerified: string;
  liveVideoAuditStatus: string;
  directClinicPayout: boolean;
  verifiedAt: string;
  medicalOrderSummary: string;
  proofPhotoUrl: string;
  expenseBreakdown: DonationExpenseItem[];
}

export interface DonationUpdate {
  id?: string;
  date: string;
  stage?: "Ingreso Clínico" | "En Procedimiento" | "Recuperación" | "¡Alta Médica!";
  note: string;
  photoUrl?: string;
}

export interface DonationCampaign {
  id: string;
  animalName: string;
  species: "dog" | "cat";
  breed: string;
  age: string;
  location: string;
  foundationName: string;
  foundationAvatar: string;
  foundationQrUrl?: string;
  foundationPaymentAlias?: string;
  currentStage?: "Ingreso Clínico" | "En Procedimiento" | "Recuperación" | "¡Alta Médica!";
  urgencyLevel: "Crítico" | "Tratamiento Activo" | "Alimento y Refugio";
  title: string;
  story: string;
  imageUrl: string;
  goalAmount: number;
  raisedAmount: number;
  currency: string;
  donorsCount: number;
  createdAt: string;
  verification: DonationVerification;
  recentDonors: DonationRecord[];
  updates?: DonationUpdate[];
}

export interface UserDonationHistoryItem {
  id: string;
  campaignId: string;
  animalName: string;
  species: "dog" | "cat";
  animalImage: string;
  foundationName: string;
  amount: number;
  currency: string;
  date: string;
  paymentMethod: string;
  receiptCode: string;
  message?: string;
}


