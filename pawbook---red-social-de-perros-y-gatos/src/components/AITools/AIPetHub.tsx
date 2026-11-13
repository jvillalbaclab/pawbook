import React, { useState, useEffect, useRef } from "react";
import {
  PetProfile,
  AITranslationResult,
  AIAnalysisResult,
  Post,
  FrequentPetSound,
  PetConversationMessage,
} from "../../types";
import {
  Mic,
  Square,
  Sparkles,
  Volume2,
  BookOpen,
  Dna,
  RefreshCw,
  Share2,
  Check,
  Send,
  BookmarkPlus,
  MessageCircle,
  Radio,
  ArrowLeftRight,
} from "lucide-react";
import { playBark, playMeow, playAnimalSentence } from "../../utils/soundSynthesizer";

interface AIPetHubProps {
  activePet: PetProfile;
  frequentSounds?: FrequentPetSound[];
  onSaveFrequentSound?: (sound: FrequentPetSound) => void;
  onCreatePost: (post: Omit<Post, "id" | "timestamp" | "reactions" | "comments">) => void;
}

interface HumanToPetResult {
  animalPhonetic: string;
  soundSequence: string[];
  bodyLanguageTip: string;
  howPetUnderstandsIt: string;
  expectedReaction: string;
}

const CONTEXT_SHORTCUTS = [
  "Frente a su plato",
  "Mirando la correa",
  "Mirándome fijo",
  "Sonó el timbre",
  "Tocándome con la pata",
];

const HUMAN_PHRASE_SHORTCUTS = [
  "¡Te quiero muchísimo, eres el mejor!",
  "¿Quieres ir de paseo al parque?",
  "¡Ya está lista tu comida rica!",
  "Ya vuelvo pronto, cuida la casa",
  "¡Ven aquí a dormir conmigo!",
];

const HUMAN_TONES = [
  { id: "Cariñoso y tierno", label: "💕 Cariñoso" },
  { id: "Entusiasmado de juego", label: "🎾 Fiesta / Juego" },
  { id: "Suave y relajante", label: "💤 Calma" },
  { id: "Premio y felicitación", label: "🦴 ¡Muy bien!" },
];

export const AIPetHub: React.FC<AIPetHubProps> = ({
  activePet,
  frequentSounds = [],
  onSaveFrequentSound,
  onCreatePost,
}) => {
  const [activeTool, setActiveTool] = useState<"translator" | "story" | "analyzer">("translator");
  // Direction inside Translator: "pet-to-human" vs "human-to-pet"
  const [translatorDirection, setTranslatorDirection] = useState<"pet-to-human" | "human-to-pet">(
    "pet-to-human"
  );

  // =========================================================================
  // DIRECTION 1: MASCOTA ➔ HUMANO STATE
  // =========================================================================
  const [inputSound, setInputSound] = useState(
    activePet.species === "dog"
      ? "¡Wuf wuf! *gemido cortito mirando la puerta* ¡Arf!"
      : "¡Mrrrr-miauuu! *ronroneo intenso frotándose en mi pierna*"
  );
  const [context, setContext] = useState(
    activePet.species === "dog"
      ? "Frente a la puerta moviendo la cola y mirándome fijo"
      : "En la cocina frente a la alacena de premios"
  );
  const [translationResult, setTranslationResult] = useState<AITranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Audio Recording State (shared cleanly across both directions)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedLabel, setRecordedLabel] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  // Save Frequent Sound State
  const [isSavedFrequent, setIsSavedFrequent] = useState(false);
  const [customSoundTitle, setCustomSoundTitle] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  // Live Two-Way Conversation State
  const [conversation, setConversation] = useState<PetConversationMessage[]>([]);
  const [ownerReply, setOwnerReply] = useState("");
  const [isPetReplying, setIsPetReplying] = useState(false);

  // =========================================================================
  // DIRECTION 2: HUMANO ➔ MASCOTA (BARK / MEOW TRANSLATOR) STATE
  // =========================================================================
  const [humanMessage, setHumanMessage] = useState("¡Te quiero muchísimo, eres mi compañero favorito!");
  const [humanTone, setHumanTone] = useState(HUMAN_TONES[0].id);
  const [isRecordingHuman, setIsRecordingHuman] = useState(false);
  const [humanRecordSec, setHumanRecordSec] = useState(0);
  const [isTranslatingToPet, setIsTranslatingToPet] = useState(false);
  const [isPlayingPetAudio, setIsPlayingPetAudio] = useState(false);
  const [humanToPetResult, setHumanToPetResult] = useState<HumanToPetResult | null>(null);

  // =========================================================================
  // OTHER AI TOOLS: STORY & DNA ANALYZER
  // =========================================================================
  const [companionName, setCompanionName] = useState("Michi el Gato");
  const [storyTheme, setStoryTheme] = useState("El misterio de la pelota bajo el sofá");
  const [storyResult, setStoryResult] = useState<{
    title: string;
    story: string;
    moral: string;
  } | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  const [physicalTraits, setPhysicalTraits] = useState(
    `${activePet.breed}, ojos expresivos y orejas atentas`
  );
  const [behaviors, setBehaviors] = useState(
    `Jugar con ${activePet.favoriteToy} y pedir ${activePet.favoriteTreat}`
  );
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [sharedSuccess, setSharedSuccess] = useState(false);

  const petFrequentSounds = frequentSounds.filter(
    (s) => s.petId === activePet.id || s.species === activePet.species
  );

  const animalLangLabel = activePet.species === "dog" ? "Perruno (Ladridos)" : "Gatuno (Maullidos)";

  // Cleanup microphone timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Microphone Recorder for Pet Sound (Mascota ➔ Humano)
  const handleToggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      const duration = Math.max(2, recordingSeconds);
      const dogSamples = [
        "¡Wuf-wuf agudo! *resoplido nasal* + 2 golpecitos de pata",
        "*Gemido suave ascendente (mmm-arf)* mirando sin parpadear",
        "¡Guau corto! *jadeo alegre con cola en hélice* ¡Wuf!",
      ];
      const catSamples = [
        "¡Mrrr-miauuu largo en vibrato! *ronroneo motorizado*",
        "*Maullido cortito 'miau-ek'* + parpadeo lento mirándote",
        "¡Miau agudo exigente! *frotando cabecita en tu tobillo*",
      ];
      const pool = activePet.species === "dog" ? dogSamples : catSamples;
      setInputSound(pool[duration % pool.length]);
      setRecordedLabel(`Sonido capturado (${duration}s) · Listo para traducir`);
      if (activePet.species === "dog") playBark("playful");
      else playMeow("cute");
      return;
    }

    setRecordedLabel(null);
    setRecordingSeconds(0);
    setIsRecording(true);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch {
      // Fallback for restricted iframe audio permissions
    }
    timerRef.current = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  // Microphone Recorder for Human Voice (Humano ➔ Mascota)
  const handleToggleHumanRecording = async () => {
    if (isRecordingHuman) {
      setIsRecordingHuman(false);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      const duration = Math.max(2, humanRecordSec);
      const spokenSamples = [
        `¡Hola ${activePet.name}! Te quiero muchísimo, ¿vamos a pasear?`,
        `¡Quién es el ${activePet.species === "dog" ? "perrito" : "gatito"} más lindo de toda la casa!`,
        `${activePet.name}, ven aquí que te tengo un premio delicioso`,
      ];
      const capturedText = spokenSamples[duration % spokenSamples.length];
      setHumanMessage(capturedText);
      return;
    }

    setHumanRecordSec(0);
    setIsRecordingHuman(true);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch {
      // Fallback for iframe permissions
    }
    timerRef.current = window.setInterval(() => {
      setHumanRecordSec((prev) => prev + 1);
    }, 1000);
  };

  // Play Pet Audio Sequence with visual feedback
  const triggerPetAudioPlayback = (sequence?: string[]) => {
    setIsPlayingPetAudio(true);
    playAnimalSentence(activePet.species, sequence);
    window.setTimeout(() => {
      setIsPlayingPetAudio(false);
    }, 1250);
  };

  // Run Human ➔ Pet Translation
  const handleTranslateHumanToPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!humanMessage.trim()) return;
    setIsTranslatingToPet(true);

    try {
      const response = await fetch("/api/gemini/human-to-pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petName: activePet.name,
          species: activePet.species,
          breed: activePet.breed,
          humanMessage: humanMessage.trim(),
          tone: humanTone,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const result: HumanToPetResult = {
        animalPhonetic: data.animalPhonetic,
        soundSequence:
          Array.isArray(data.soundSequence) && data.soundSequence.length > 0
            ? data.soundSequence
            : activePet.species === "dog"
            ? ["playful", "happy", "playful"]
            : ["cute", "purr", "cute"],
        bodyLanguageTip: data.bodyLanguageTip,
        howPetUnderstandsIt: data.howPetUnderstandsIt,
        expectedReaction: data.expectedReaction,
      };

      setHumanToPetResult(result);
      triggerPetAudioPlayback(result.soundSequence);
    } catch {
      const fallback: HumanToPetResult =
        activePet.species === "dog"
          ? {
              animalPhonetic: "¡Wuf-wuf cantarín! *Mmm-arf suave* + ¡Guau alegre con colita en hélice! 🐕🎶",
              soundSequence: ["playful", "happy", "playful"],
              bodyLanguageTip:
                "Inclina ligeramente la cabeza hacia un lado y sonríe relajado mientras suena el audio.",
              howPetUnderstandsIt: `${activePet.name} entiende: «¡Eres el mejor de mi manada y quiero compartir alegría contigo ahora mismo!»`,
              expectedReaction:
                "Levantará las orejas de golpe, ladeará la cabecita con curiosidad y moverá la cola buscándote.",
            }
          : {
              animalPhonetic: "¡Mrrr-miauuu melódico! *Ronroneo vibrato 22Hz* + ¡Miu-ek cortito! 🐈🎶",
              soundSequence: ["cute", "purr", "cute"],
              bodyLanguageTip:
                "Haz un parpadeo lento de 2 segundos mirándolo mientras reproduces el maullido.",
              howPetUnderstandsIt: `${activePet.name} entiende: «Te respeto, te adoro y todo nuestro territorio está en paz.»`,
              expectedReaction:
                "Girará una orejita hacia el teléfono, te devolverá el parpadeo lento y se acercará con la cola en signo de interrogación.",
            };

      setHumanToPetResult(fallback);
      triggerPetAudioPlayback(fallback.soundSequence);
    } finally {
      setIsTranslatingToPet(false);
    }
  };

  // Run Pet ➔ Human Translation
  const runTranslation = async (soundToTranslate: string, contextToUse: string) => {
    setIsTranslating(true);
    setIsSavedFrequent(false);
    setShowSaveForm(false);

    if (activePet.species === "dog") playBark("playful");
    else playMeow("demanding");

    try {
      const response = await fetch("/api/gemini/translate-sound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petName: activePet.name,
          species: activePet.species,
          breed: activePet.breed,
          inputSound: soundToTranslate,
          context: contextToUse,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const result: AITranslationResult = {
        translation: data.translation,
        acousticTranscription: data.acousticTranscription || soundToTranslate,
        whatImDoing:
          data.whatImDoing ||
          `Usando vocalización y lenguaje corporal frente a ti (${contextToUse.toLowerCase()}).`,
        whatIThinkOfYou:
          data.whatIThinkOfYou ||
          `Piensa que eres su persona favorita y que entenderás su mensaje enseguida.`,
        emotion: data.emotion,
        subtext: data.subtext,
        demandLevel: data.demandLevel,
        adviceForHuman: data.adviceForHuman,
      };

      setTranslationResult(result);
      setConversation([
        {
          id: `msg-${Date.now()}`,
          sender: "pet",
          text: result.translation,
          acousticSound: result.acousticTranscription,
          whatImDoing: result.whatImDoing,
          whatIThinkOfYou: result.whatIThinkOfYou,
          timestamp: "Ahora",
        },
      ]);
    } catch {
      const fallback: AITranslationResult = {
        translation:
          activePet.species === "dog"
            ? `«¡Oye humano! ${contextToUse} requiere tu atención inmediata (y un premio extra).»`
            : `«Humano, llevo 3 minutos emitiendo este sonido con elegancia felina. Atiende mi petición.»`,
        acousticTranscription: soundToTranslate,
        whatImDoing:
          activePet.species === "dog"
            ? "Alternando contacto visual directo entre tus ojos y su objetivo mientras mueve la cola."
            : "Manteniendo la cola erguida mientras modula el maullido para captar tu atención.",
        whatIThinkOfYou:
          "Piensa que eres su humano favorito del mundo y confía plenamente en que le harás caso.",
        emotion: "Amor + Petición Directa",
        subtext: "Sé que si pongo ojitos tiernos me vas a decir que sí.",
        demandLevel: "90%",
        adviceForHuman: `Respóndele con voz suave o usa la pestaña «Hablarle en ${
          activePet.species === "dog" ? "Perruno" : "Gatuno"
        }» para contestarle en su idioma.`,
      };
      setTranslationResult(fallback);
      setConversation([
        {
          id: `msg-${Date.now()}`,
          sender: "pet",
          text: fallback.translation,
          acousticSound: fallback.acousticTranscription,
          whatImDoing: fallback.whatImDoing,
          whatIThinkOfYou: fallback.whatIThinkOfYou,
          timestamp: "Ahora",
        },
      ]);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    await runTranslation(inputSound, context);
  };

  const handleSelectFrequentSound = (sound: FrequentPetSound) => {
    setTranslatorDirection("pet-to-human");
    setInputSound(sound.acousticTranscription);
    setContext(sound.context);
    setRecordedLabel(`Sonido frecuente (${sound.durationSec}s)`);
    if (activePet.species === "dog") playBark("happy");
    else playMeow("cute");

    const instantResult: AITranslationResult = {
      translation: sound.whatItMeans,
      acousticTranscription: sound.acousticTranscription,
      whatImDoing: `Haciendo su sonido habitual ("${sound.title}") en situación: ${sound.context}.`,
      whatIThinkOfYou: sound.whatPetThinksOfOwner,
      emotion: "Hábito Favorito",
      subtext: "Ya nos entendemos con solo mirarnos.",
      demandLevel: "85%",
      adviceForHuman: `Respóndele aquí abajo o tradúcele tu respuesta a ${
        activePet.species === "dog" ? "ladrido" : "maullido"
      }.`,
    };

    setTranslationResult(instantResult);
    setConversation([
      {
        id: `msg-${Date.now()}`,
        sender: "pet",
        text: sound.whatItMeans,
        acousticSound: sound.acousticTranscription,
        whatImDoing: instantResult.whatImDoing,
        whatIThinkOfYou: sound.whatPetThinksOfOwner,
        timestamp: "Frecuente",
      },
    ]);
  };

  const handleSaveCurrentAsFrequent = () => {
    if (!translationResult || !onSaveFrequentSound) return;
    const titleToSave =
      customSoundTitle.trim() || (context.length > 30 ? `${context.slice(0, 30)}...` : context);

    const newFreq: FrequentPetSound = {
      id: `freq-${Date.now()}`,
      petId: activePet.id,
      petName: activePet.name,
      species: activePet.species,
      title: titleToSave,
      acousticTranscription: translationResult.acousticTranscription || inputSound,
      context,
      whatItMeans: translationResult.translation,
      whatPetThinksOfOwner:
        translationResult.whatIThinkOfYou || "Siente un vínculo único contigo.",
      durationSec: recordingSeconds > 0 ? recordingSeconds : 4,
      createdAt: "Hoy",
    };

    onSaveFrequentSound(newFreq);
    setIsSavedFrequent(true);
    setShowSaveForm(false);
    setCustomSoundTitle("");
  };

  const handleSendOwnerReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerReply.trim() || isPetReplying) return;

    const userText = ownerReply.trim();
    setOwnerReply("");

    const ownerMsg: PetConversationMessage = {
      id: `own-${Date.now()}`,
      sender: "owner",
      text: userText,
      timestamp: "Ahora",
    };

    setConversation((prev) => [...prev, ownerMsg]);
    setIsPetReplying(true);

    try {
      const response = await fetch("/api/gemini/pet-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petName: activePet.name,
          species: activePet.species,
          breed: activePet.breed,
          context,
          userMessage: userText,
          lastSound: inputSound,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (activePet.species === "dog") playBark("happy");
      else playMeow("purr");

      setConversation((prev) => [
        ...prev,
        {
          id: `pet-${Date.now()}`,
          sender: "pet",
          text: data.petReply,
          acousticSound: data.acousticSound,
          whatImDoing: data.whatImDoing,
          whatIThinkOfYou: data.whatIThinkOfYou,
          timestamp: "Ahora",
        },
      ]);
    } catch {
      if (activePet.species === "dog") playBark("happy");
      else playMeow("cute");

      setConversation((prev) => [
        ...prev,
        {
          id: `pet-${Date.now()}`,
          sender: "pet",
          text:
            activePet.species === "dog"
              ? `«¡Sabía que me entendías! Te doy un lengüetazo y muevo la cola el doble de rápido.»`
              : `«Acepto tus palabras, humano. Parpadeare despacito en señal de cariño.»`,
          acousticSound:
            activePet.species === "dog" ? "*Wuf alegre*" : "*Ronroneo suave mrrr*",
          whatImDoing: "Acercándose a tu mano con confianza.",
          whatIThinkOfYou: "Piensa que hablar contigo es lo mejor de su día.",
          timestamp: "Ahora",
        },
      ]);
    } finally {
      setIsPetReplying(false);
    }
  };

  const handleGenerateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingStory(true);
    try {
      const response = await fetch("/api/gemini/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petName: activePet.name,
          species: activePet.species,
          companionName,
          theme: storyTheme,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setStoryResult(data);
    } catch {
      setStoryResult({
        title: `${activePet.name} y la Misión del Sofá`,
        story: `A las 3:15 PM, ${activePet.name} detectó una pista bajo el cojín. Junto a ${companionName}, recuperaron su juguete favorito y celebraron con una siesta sincronizada 🐾✨.`,
        moral: "Todo es mejor cuando se comparte con un buen amigo peludo.",
      });
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleAnalyzePet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/gemini/analyze-pet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petName: activePet.name,
          species: activePet.species,
          physicalTraits,
          behaviors,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setAnalysisResult(data);
    } catch {
      setAnalysisResult({
        archetype: "El Aristócrata del Sofá & Maestro de Caricias 👑",
        estimatedBreedMix: [
          `50% ${activePet.breed}`,
          "30% Detector Ultrasónico de Premios",
          "20% Puro Amor",
        ],
        superpowers: ["Mirada hipnótica para pedir comida", "Siestas olímpicas"],
        kryptonite: "El sonido del empaque de premios abriéndose",
        compatibility: "Humanos cariñosos y amigos de parque juguetones",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const shareToFeed = (content: string) => {
    onCreatePost({
      petId: activePet.id,
      petName: activePet.name,
      petAvatar: activePet.avatar,
      species: activePet.species,
      breed: activePet.breed,
      location: "Traductor IA PawBook ✨",
      mood: "Conectados 🐾",
      caption: content,
    });
    setSharedSuccess(true);
    setTimeout(() => setSharedSuccess(false), 3000);
  };

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-0 py-3.5 sm:py-5 space-y-3.5">
      {/* Ultra-Clean Mobile Header */}
      <div className="bg-white rounded-[24px] p-4 border border-stone-200/80 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={activePet.avatar}
              alt={activePet.name}
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-full object-cover ring-2 ring-[#FF5A36] shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-stone-400">
                Traductor Bidireccional IA · {activePet.breed}
              </p>
              <h1 className="font-display font-extrabold text-base sm:text-lg text-stone-900 truncate">
                Habla con {activePet.name} {activePet.species === "dog" ? "🐕" : "🐈"}
              </h1>
            </div>
          </div>

          {sharedSuccess && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
              <Check className="w-3.5 h-3.5" />
              <span>Publicado</span>
            </span>
          )}
        </div>

        {/* Main Tool Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#F3F1EC] rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTool("translator")}
            className={`min-h-[40px] px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTool === "translator"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#FF5A36] shrink-0" />
            <span className="truncate">Traductor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("story")}
            className={`min-h-[40px] px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTool === "story"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cuentos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("analyzer")}
            className={`min-h-[40px] px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTool === "analyzer"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Dna className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Personalidad</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          TOOL 1: BIDIRECTIONAL PET TRANSLATOR
         ===================================================================== */}
      {activeTool === "translator" && (
        <div className="space-y-3.5">
          {/* Bidirectional Mode Switcher: Mascota ➔ Humano vs Humano ➔ Mascota */}
          <div className="bg-white rounded-[24px] p-2 border border-stone-200/80 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setTranslatorDirection("pet-to-human")}
              className={`min-h-[46px] px-3 py-2 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                translatorDirection === "pet-to-human"
                  ? "bg-stone-900 text-white shadow-2xs"
                  : "bg-[#FAF9F6] text-stone-600 hover:text-stone-900"
              }`}
            >
              <span>{activePet.species === "dog" ? "🐕" : "🐈"}</span>
              <span className="truncate">Escuchar a {activePet.name}</span>
            </button>

            <button
              type="button"
              onClick={() => setTranslatorDirection("human-to-pet")}
              className={`min-h-[46px] px-3 py-2 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                translatorDirection === "human-to-pet"
                  ? "bg-[#FF5A36] text-white shadow-2xs"
                  : "bg-[#FAF9F6] text-stone-600 hover:text-stone-900"
              }`}
            >
              <span>🗣️</span>
              <span className="truncate">
                Hablarle en {activePet.species === "dog" ? "Perruno" : "Gatuno"}
              </span>
            </button>
          </div>

          {/* -----------------------------------------------------------------
              MODE A: HUMANO ➔ MASCOTA (TRANSLATE HUMAN TO BARKS / MEOWS)
             ----------------------------------------------------------------- */}
          {translatorDirection === "human-to-pet" && (
            <div className="space-y-3.5">
              <form
                onSubmit={handleTranslateHumanToPet}
                className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-4"
              >
                {/* Microphone Voice Input Row */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    isRecordingHuman
                      ? "bg-rose-50 border-rose-300"
                      : "bg-[#FAF9F6] border-stone-200/70"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-stone-900 block">
                      {isRecordingHuman
                        ? `Escuchando tu voz... (0:0${humanRecordSec})`
                        : `Dile algo a ${activePet.name} con tu voz`}
                    </span>
                    <span className="text-[11px] text-stone-500 block truncate">
                      Lo convertiremos a {animalLangLabel.toLowerCase()} reales
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleHumanRecording}
                    className={`min-h-[44px] px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer ${
                      isRecordingHuman
                        ? "bg-rose-600 text-white"
                        : "bg-stone-900 text-white hover:bg-stone-800"
                    }`}
                  >
                    {isRecordingHuman ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Listo</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 text-[#FF5A36]" />
                        <span>Hablar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Phrase Shortcuts */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-700">
                    ¿Qué quieres decirle a {activePet.name}?
                  </label>

                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {HUMAN_PHRASE_SHORTCUTS.map((phrase) => (
                      <button
                        type="button"
                        key={phrase}
                        onClick={() => setHumanMessage(phrase)}
                        className={`min-h-[34px] px-3 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          humanMessage === phrase
                            ? "bg-stone-900 text-white"
                            : "bg-[#F3F1EC] text-stone-700 hover:text-stone-900"
                        }`}
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={humanMessage}
                    onChange={(e) => setHumanMessage(e.target.value)}
                    rows={2}
                    placeholder={`Escribe lo que quieres decirle a ${activePet.name}...`}
                    className="w-full bg-[#FAF9F6] border border-stone-200/90 rounded-2xl p-3 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900 resize-none"
                    required
                  />
                </div>

                {/* Tone Selector */}
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold text-stone-700">
                    Intención emocional
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {HUMAN_TONES.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setHumanTone(t.id)}
                        className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          humanTone === t.id
                            ? "bg-stone-900 text-white"
                            : "bg-[#FAF9F6] border border-stone-200/70 text-stone-700"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isTranslatingToPet}
                  className="w-full min-h-[48px] bg-[#FF5A36] hover:bg-[#E04826] disabled:opacity-50 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all active:scale-98 cursor-pointer shadow-xs"
                >
                  {isTranslatingToPet ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>
                        Traduciendo a {activePet.species === "dog" ? "ladridos" : "maullidos"}...
                      </span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>
                        Traducir a {activePet.species === "dog" ? "Ladrido" : "Maullido"} y Sonar
                      </span>
                    </>
                  )}
                </button>
              </form>

              {/* Result Card: Phonetic + Big Audio Speaker for the Pet + Reaction */}
              {humanToPetResult && (
                <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-4">
                  {/* Sound Player Box for the Pet */}
                  <div className="bg-stone-900 text-white rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-stone-300">
                      <span>
                        Traducción en {animalLangLabel} para {activePet.name}
                      </span>
                      <span className="text-[#FF5A36] font-bold">Frecuencia Activa</span>
                    </div>

                    <p className="font-display font-extrabold text-base sm:text-lg text-white leading-snug">
                      {humanToPetResult.animalPhonetic}
                    </p>

                    <button
                      type="button"
                      onClick={() => triggerPetAudioPlayback(humanToPetResult.soundSequence)}
                      className={`w-full min-h-[48px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                        isPlayingPetAudio
                          ? "bg-emerald-500 text-stone-950"
                          : "bg-[#FF5A36] hover:bg-[#E04826] text-white"
                      }`}
                    >
                      <Volume2 className={`w-4 h-4 ${isPlayingPetAudio ? "animate-bounce" : ""}`} />
                      <span>
                        {isPlayingPetAudio
                          ? `Reproduciendo ${
                              activePet.species === "dog" ? "ladridos" : "maullidos"
                            } para ${activePet.name}...`
                          : `🔊 Hacer sonar para que ${activePet.name} lo escuche`}
                      </span>
                    </button>
                  </div>

                  {/* Clean Minimalist Insights (No cluttered badge sandwiches) */}
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-stone-200/60 space-y-1">
                      <span className="text-[11px] font-bold text-stone-400">
                        Cómo lo entiende {activePet.name} · Reacción esperada
                      </span>
                      <p className="font-semibold text-stone-900 leading-relaxed">
                        {humanToPetResult.howPetUnderstandsIt}
                      </p>
                      <p className="text-stone-600 leading-relaxed pt-0.5">
                        🐾 {humanToPetResult.expectedReaction}
                      </p>
                    </div>

                    <div className="px-3.5 py-2.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-stone-700 leading-snug">
                        <strong className="text-stone-900">Gesto humano recomendado:</strong>{" "}
                        {humanToPetResult.bodyLanguageTip}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          shareToFeed(
                            `🗣️ Le dije a ${activePet.name}: "${humanMessage}" en idioma ${
                              activePet.species === "dog" ? "perruno" : "gatuno"
                            } (${humanToPetResult.animalPhonetic}) y su reacción fue increíble 🐾`
                          )
                        }
                        className="min-h-[36px] px-3 rounded-xl bg-white border border-stone-200 text-stone-800 text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Compartir
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* -----------------------------------------------------------------
              MODE B: MASCOTA ➔ HUMANO (RECORD PET SOUND + CONTEXT + CHAT)
             ----------------------------------------------------------------- */}
          {translatorDirection === "pet-to-human" && (
            <div className="space-y-3.5">
              {/* Saved Frequent Sounds Horizontal Strip */}
              {petFrequentSounds.length > 0 && (
                <div className="bg-white rounded-[24px] p-3.5 border border-stone-200/80 space-y-2.5">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-[#FF5A36]" />
                      <span>Sonidos frecuentes de {activePet.name}</span>
                    </span>
                    <span className="text-[11px] text-stone-400">1 toque para traducir</span>
                  </div>

                  <div className="flex items-stretch gap-2 overflow-x-auto no-scrollbar">
                    {petFrequentSounds.map((snd) => (
                      <button
                        type="button"
                        key={snd.id}
                        onClick={() => handleSelectFrequentSound(snd)}
                        className="min-w-[195px] max-w-[215px] p-2.5 rounded-2xl bg-[#FAF9F6] hover:bg-[#F3F1EC] border border-stone-200/70 text-left transition-all shrink-0 active:scale-98 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-stone-900 truncate">
                            {snd.title}
                          </span>
                          <span className="text-[10px] text-stone-400 shrink-0">
                            {snd.durationSec}s
                          </span>
                        </div>
                        <p className="text-[11px] text-[#FF5A36] font-medium truncate mt-0.5">
                          {snd.acousticTranscription}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clean Record + Context Form */}
              <form
                onSubmit={handleTranslate}
                className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-3.5"
              >
                {/* Step 1: Microphone Capture */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isRecording
                      ? "bg-rose-50 border-rose-300"
                      : "bg-[#FAF9F6] border-stone-200/70"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-stone-900 block">
                      {isRecording
                        ? `Escuchando a ${activePet.name}... (0:0${recordingSeconds})`
                        : `Grabar sonido de ${activePet.name}`}
                    </span>
                    <span className="text-[11px] text-stone-500 block truncate">
                      {recordedLabel || "Capturamos su ladrido, maullido o gemido"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleRecording}
                    className={`min-h-[44px] px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer ${
                      isRecording
                        ? "bg-rose-600 text-white"
                        : "bg-stone-900 hover:bg-stone-800 text-white"
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Detener</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 text-[#FF5A36]" />
                        <span>Grabar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Step 2: Sound Transcription */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Sonido capturado o escrito
                  </label>
                  <input
                    type="text"
                    value={inputSound}
                    onChange={(e) => setInputSound(e.target.value)}
                    className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200/80 rounded-xl px-3.5 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                    required
                  />
                </div>

                {/* Step 3: Situation Context */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">
                    Contexto de la situación
                  </label>

                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {CONTEXT_SHORTCUTS.map((chip) => (
                      <button
                        type="button"
                        key={chip}
                        onClick={() => setContext(chip)}
                        className={`min-h-[32px] px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          context === chip
                            ? "bg-stone-900 text-white"
                            : "bg-[#F3F1EC] text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="¿Qué está haciendo o dónde está?"
                    className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200/80 rounded-xl px-3.5 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isTranslating}
                  className="w-full min-h-[48px] bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all active:scale-98 cursor-pointer"
                >
                  {isTranslating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Interpretando a {activePet.name}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#FF5A36]" />
                      <span>Descubrir qué dice y qué piensa</span>
                    </>
                  )}
                </button>
              </form>

              {/* Clean Translation Result + Live Conversation */}
              {translationResult && (
                <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-4">
                  {/* Top Metadata Line (Clean inline typography, zero badge sandwiches) */}
                  <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="text-xs text-stone-500">
                      <span className="font-bold text-[#FF5A36]">{translationResult.emotion}</span>
                      <span className="mx-1.5">·</span>
                      <span>Exigencia {translationResult.demandLevel}</span>
                    </div>

                    {onSaveFrequentSound && (
                      <div>
                        {isSavedFrequent ? (
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Guardado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowSaveForm((prev) => !prev)}
                            className="text-xs font-bold text-stone-700 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                          >
                            <BookmarkPlus className="w-3.5 h-3.5 text-[#FF5A36]" />
                            <span>Guardar sonido</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {showSaveForm && !isSavedFrequent && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customSoundTitle}
                        onChange={(e) => setCustomSoundTitle(e.target.value)}
                        placeholder={`Nombre (ej: Ladrido de paseo)`}
                        className="flex-1 min-h-[38px] bg-[#FAF9F6] border border-stone-200 rounded-xl px-3 text-base sm:text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleSaveCurrentAsFrequent}
                        className="min-h-[38px] px-3.5 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
                      >
                        Guardar
                      </button>
                    </div>
                  )}

                  {/* Clean What Pet is Doing & Thinking Summary */}
                  <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-stone-200/60 space-y-2 text-xs">
                    <div>
                      <span className="text-[11px] font-bold text-stone-400 block">
                        ¿Qué hace físicamente {activePet.name}?
                      </span>
                      <p className="text-stone-800 font-medium leading-relaxed">
                        {translationResult.whatImDoing}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-stone-200/60">
                      <span className="text-[11px] font-bold text-stone-400 block">
                        ¿Qué piensa de ti ahora mismo?
                      </span>
                      <p className="text-stone-800 font-medium leading-relaxed">
                        💭 {translationResult.whatIThinkOfYou}
                      </p>
                    </div>
                  </div>

                  {/* Interactive Chat Thread */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-900 flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-[#FF5A36]" />
                        <span>Conversación con {activePet.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setTranslatorDirection("human-to-pet")}
                        className="text-[11px] font-bold text-[#FF5A36] hover:underline cursor-pointer"
                      >
                        Responderle en {activePet.species === "dog" ? "ladrido" : "maullido"} ➔
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {conversation.map((msg) =>
                        msg.sender === "pet" ? (
                          <div key={msg.id} className="flex items-start gap-2.5">
                            <img
                              src={activePet.avatar}
                              alt={activePet.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                            />
                            <div className="flex-1 bg-[#FAF9F6] p-3 rounded-2xl rounded-tl-xs border border-stone-200/70 space-y-1">
                              {msg.acousticSound && (
                                <span className="text-[11px] font-semibold text-[#FF5A36] block">
                                  🎙️ {msg.acousticSound}
                                </span>
                              )}
                              <p className="text-xs sm:text-sm font-bold text-stone-900 leading-relaxed">
                                {msg.text}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div key={msg.id} className="flex justify-end">
                            <div className="max-w-[82%] bg-stone-900 text-white px-3.5 py-2 rounded-2xl rounded-tr-xs text-xs">
                              {msg.text}
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <form onSubmit={handleSendOwnerReply} className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={ownerReply}
                        onChange={(e) => setOwnerReply(e.target.value)}
                        placeholder={`Respóndele a ${activePet.name}...`}
                        className="flex-1 min-h-[42px] bg-[#FAF9F6] border border-stone-200/80 rounded-xl px-3.5 text-base sm:text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                      />
                      <button
                        type="submit"
                        disabled={!ownerReply.trim() || isPetReplying}
                        className="min-h-[42px] px-4 rounded-xl bg-[#FF5A36] text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TOOL 2: STORY GENERATOR
         ===================================================================== */}
      {activeTool === "story" && (
        <div className="space-y-3.5">
          <form
            onSubmit={handleGenerateStory}
            className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-3.5"
          >
            <h2 className="font-display font-extrabold text-sm sm:text-base text-stone-900">
              Microcuento de {activePet.name}
            </h2>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Compañero de aventuras
              </label>
              <input
                type="text"
                value={companionName}
                onChange={(e) => setCompanionName(e.target.value)}
                className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200 rounded-xl px-3.5 text-base sm:text-xs text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Aventura de hoy
              </label>
              <textarea
                value={storyTheme}
                onChange={(e) => setStoryTheme(e.target.value)}
                rows={2}
                className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-3 text-base sm:text-xs text-stone-800 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isGeneratingStory}
              className="w-full min-h-[46px] bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
            >
              {isGeneratingStory ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Escribiendo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#FF5A36]" />
                  <span>Crear Cuento</span>
                </>
              )}
            </button>
          </form>

          {storyResult && (
            <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold text-base text-stone-900">
                  {storyResult.title}
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    shareToFeed(
                      `📖 "${storyResult.title}"\n\n${storyResult.story}\n\n✨ Moraleja: ${storyResult.moral}`
                    )
                  }
                  className="text-xs font-bold text-[#FF5A36] flex items-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Publicar</span>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                {storyResult.story}
              </p>
              <p className="text-xs font-semibold text-stone-900 bg-[#FAF9F6] p-3 rounded-xl">
                ✨ Moraleja: {storyResult.moral}
              </p>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TOOL 3: PERSONALITY & DNA ANALYZER
         ===================================================================== */}
      {activeTool === "analyzer" && (
        <div className="space-y-3.5">
          <form
            onSubmit={handleAnalyzePet}
            className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-3.5"
          >
            <h2 className="font-display font-extrabold text-sm sm:text-base text-stone-900">
              Escáner de Personalidad de {activePet.name}
            </h2>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Rasgos físicos
              </label>
              <input
                type="text"
                value={physicalTraits}
                onChange={(e) => setPhysicalTraits(e.target.value)}
                className="w-full min-h-[42px] bg-[#FAF9F6] border border-stone-200 rounded-xl px-3.5 text-base sm:text-xs text-stone-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Costumbres divertidas
              </label>
              <textarea
                value={behaviors}
                onChange={(e) => setBehaviors(e.target.value)}
                rows={2}
                className="w-full bg-[#FAF9F6] border border-stone-200 rounded-xl p-3 text-base sm:text-xs text-stone-800 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isAnalyzing}
              className="w-full min-h-[46px] bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analizando...</span>
                </>
              ) : (
                <>
                  <Dna className="w-4 h-4 text-emerald-500" />
                  <span>Analizar Personalidad</span>
                </>
              )}
            </button>
          </form>

          {analysisResult && (
            <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/80 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-stone-400 block">
                    Arquetipo de {activePet.name}
                  </span>
                  <h3 className="font-display font-extrabold text-base text-stone-900">
                    {analysisResult.archetype}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    shareToFeed(
                      `🧬 Análisis de ${activePet.name}: "${analysisResult.archetype}" · ${analysisResult.estimatedBreedMix.join(
                        ", "
                      )} 🐾`
                    )
                  }
                  className="text-xs font-bold text-[#FF5A36] flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Publicar</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-stone-200/60 space-y-2 text-xs">
                <p className="text-stone-700">
                  <strong className="text-stone-900">Fórmula ADN:</strong>{" "}
                  {analysisResult.estimatedBreedMix.join(" · ")}
                </p>
                <p className="text-stone-700">
                  <strong className="text-stone-900">Superpoderes:</strong>{" "}
                  {analysisResult.superpowers.join(" · ")}
                </p>
                <p className="text-stone-700">
                  <strong className="text-stone-900">Debilidad secreta:</strong>{" "}
                  {analysisResult.kryptonite}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
