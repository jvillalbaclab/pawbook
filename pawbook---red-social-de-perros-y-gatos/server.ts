import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Endpoint: AI Pet Sound Translator & Acoustic Context Analyzer
app.post("/api/gemini/translate-sound", async (req, res) => {
  try {
    const { petName, species, breed, inputSound, context } = req.body;
    const ai = getGeminiClient();

    const prompt = `Actúa como un etólogo experto y traductor conversacional de mascotas. Estás traduciendo en tiempo real a ${petName || "la mascota"} (${species === "cat" ? "Gato" : "Perro"}, Raza: ${breed || "Mestizo"}).
Sonido grabado o transcrito: "${inputSound || "¡Woof woof arf!"}".
Contexto de la situación descrito por su humano: "${context || "En la sala mirándome fijamente"}".

Haz que el humano sienta que realmente está hablando con su mascota y entienda qué hace y qué piensa de él/ella.
Responde estrictamente en formato JSON con esta estructura:
{
  "translation": "Lo que dice la mascota en primera persona hablándole directamente a su humano con cariño, autenticidad y chispa",
  "acousticTranscription": "Transcripción fonética y tonal del sonido grabado (ej: '2 ladridos agudos cortos + gemido nasal ascendente')",
  "whatImDoing": "Explicación clara de qué está haciendo físicamente la mascota con este sonido y postura",
  "whatIThinkOfYou": "Qué está pensando la mascota sobre su humano en este preciso instante",
  "emotion": "Emoción dominante (ej: Emoción desbordante, Hambre dramática, Amor y apego, Curiosidad alerta)",
  "subtext": "Pensamiento secreto que guarda en su cabecita",
  "demandLevel": "Porcentaje de urgencia/exigencia de 0% a 100%",
  "adviceForHuman": "Recomendación práctica y tierna de cómo responderle ahora mismo"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translation: { type: Type.STRING },
            acousticTranscription: { type: Type.STRING },
            whatImDoing: { type: Type.STRING },
            whatIThinkOfYou: { type: Type.STRING },
            emotion: { type: Type.STRING },
            subtext: { type: Type.STRING },
            demandLevel: { type: Type.STRING },
            adviceForHuman: { type: Type.STRING },
          },
          required: [
            "translation",
            "acousticTranscription",
            "whatImDoing",
            "whatIThinkOfYou",
            "emotion",
            "subtext",
            "demandLevel",
            "adviceForHuman",
          ],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in translate-sound:", error);
    res.status(500).json({ error: error.message || "Error al traducir sonido con IA" });
  }
});

// Endpoint: Two-Way Live Conversation with Your Pet
app.post("/api/gemini/pet-conversation", async (req, res) => {
  try {
    const { petName, species, breed, context, userMessage, lastSound } = req.body;
    const ai = getGeminiClient();

    const prompt = `Eres ${petName || "Max"}, un ${species === "cat" ? "gato" : "perro"} de raza ${breed || "noble"} conversando en directo con tu humano favorito gracias al traductor de PawBook.
Situación actual: "${context || "En casa juntos"}".
Último sonido que hiciste: "${lastSound || "Sonido atento"}".
Tu humano te acaba de decir o responder: "${userMessage}".

Responde en primera persona como ${petName} para que tu humano sienta que de verdad está conversando contigo.
Devuelve estrictamente JSON:
{
  "petReply": "Tu respuesta directa, expresiva, tierna y con personalidad animal a lo que te dijo tu humano",
  "acousticSound": "El sonido que emites al responder (ej: '*Ronroneo grave mrrr-miau*' o '*Wuf bajito moviendo la cola*')",
  "whatImDoing": "Tu gesto o acción física mientras le respondes (ej: 'Inclinando la cabeza a un lado y dándote un toquecito con la nariz')",
  "whatIThinkOfYou": "Lo que piensas de tu humano al escuchar lo que te acaba de decir"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            petReply: { type: Type.STRING },
            acousticSound: { type: Type.STRING },
            whatImDoing: { type: Type.STRING },
            whatIThinkOfYou: { type: Type.STRING },
          },
          required: ["petReply", "acousticSound", "whatImDoing", "whatIThinkOfYou"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in pet-conversation:", error);
    res.status(500).json({ error: error.message || "Error en conversación con mascota" });
  }
});

// Endpoint: Human-to-Pet Translator (Humano ➔ Idioma Perruno / Gatuno)
app.post("/api/gemini/human-to-pet", async (req, res) => {
  try {
    const { petName, species, breed, humanMessage, tone } = req.body;
    const ai = getGeminiClient();

    const isCat = species === "cat";
    const prompt = `Actúa como un etólogo experto y traductor acústico animal. Un humano quiere decirle esto a su ${
      isCat ? "gato" : "perro"
    } llamado ${petName || "Max"} (Raza: ${breed || "Mestizo"}):
Mensaje del humano: "${humanMessage || "¡Te quiero muchísimo, eres el mejor!"}".
Tono emocional del humano: "${tone || "Cariñoso y alegre"}".

Traduce este mensaje humano al idioma sonoro y corporal real de un ${
      isCat ? "gato (maullidos, trinos, ronroneos)" : "perro (ladridos, gemidos tiernos, resoplidos de juego)"
    } de forma divertida, tierna y científicamente coherente.
Responde estrictamente en JSON con esta estructura:
{
  "animalPhonetic": "Transcripción fonética divertida lista para leer o imitar (ej: '¡Wuf-wuf cortito! *mmm-arf cantarín* + ¡Guau alegre!' o '¡Mrrr-miauuu en vibrato! *ronroneo motorizado* + ¡Miu-ek!')",
  "soundSequence": ["Lista de 3 tonos para el sintetizador de audio. Si es perro usa combinaciones de: 'happy', 'playful', 'deep'. Si es gato usa combinaciones de: 'cute', 'purr', 'demanding'"],
  "bodyLanguageTip": "1 consejo breve de lenguaje corporal que el humano debe hacer mientras reproduce el sonido (ej: 'Parpadea lento y baja un poco los hombros')",
  "howPetUnderstandsIt": "Cómo interpreta ${petName} este sonido en su mente animal (en 1 frase clara y encantadora)",
  "expectedReaction": "La reacción inmediata y divertida que tendrá ${petName} al escucharte"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            animalPhonetic: { type: Type.STRING },
            soundSequence: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            bodyLanguageTip: { type: Type.STRING },
            howPetUnderstandsIt: { type: Type.STRING },
            expectedReaction: { type: Type.STRING },
          },
          required: [
            "animalPhonetic",
            "soundSequence",
            "bodyLanguageTip",
            "howPetUnderstandsIt",
            "expectedReaction",
          ],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in human-to-pet:", error);
    res.status(500).json({ error: error.message || "Error al traducir de humano a mascota" });
  }
});

// Endpoint: Veterinary Telemedicine Orientation Assistant
app.post("/api/gemini/vet-telemed", async (req, res) => {
  try {
    const { vetName, vetSpecialty, petName, species, breed, age, symptoms } = req.body;
    const ai = getGeminiClient();

    const prompt = `Actúa como ${vetName || "Dra. Elena Morales"}, especialista en ${vetSpecialty || "Medicina General Veterinaria"} atendiendo una consulta de Telemedicina Animal en PawBook.
Paciente: ${petName || "Mascota"} (${species === "cat" ? "Gato" : "Perro"}, ${breed || "Mestizo"}, ${age || "Adulto"}).
Motivo de consulta / síntomas descritos por el tutor: "${symptoms}".

Brinda una respuesta clínica empática, clara y profesional en español estructurada en JSON:
{
  "doctorGreeting": "Saludo cercano y valoración inicial tranquilizadora en primera persona",
  "clinicalObservation": "Qué podría estar ocurriendo según los signos descritos",
  "immediateCareSteps": ["Paso práctico 1 en casa", "Paso práctico 2 de observación"],
  "warningSigns": "Signos de alerta ante los cuales acudir a consulta física de urgencia",
  "recommendedModality": "Recomendación de seguimiento (ej: 'Seguimiento por Telemedicina en 24h' o 'Valoración Física en Clínica')"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            doctorGreeting: { type: Type.STRING },
            clinicalObservation: { type: Type.STRING },
            immediateCareSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            warningSigns: { type: Type.STRING },
            recommendedModality: { type: Type.STRING },
          },
          required: [
            "doctorGreeting",
            "clinicalObservation",
            "immediateCareSteps",
            "warningSigns",
            "recommendedModality",
          ],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in vet-telemed:", error);
    res.status(500).json({ error: error.message || "Error en teleconsulta veterinaria" });
  }
});

// Endpoint: AI Pet Caption Generator (Generador de Leyendas para Publicaciones)
app.post("/api/gemini/generate-caption", async (req, res) => {
  try {
    const { petName, species, breed, mood, description } = req.body;
    const ai = getGeminiClient();

    const prompt = `Eres el community manager interno de una red social de mascotas (PawBook).
Genera 3 opciones de descripciones/captions cómicas y encantadoras en español para una foto publicada por ${petName} (${species === "cat" ? "Gato" : "Perro"}, Raza: ${breed || "Mestizo de noble cuna"}).
Estado de ánimo / Estilo deseado: ${mood || "Divertido y travieso"}.
Descripción de la foto / acción: "${description || "Mirando fijamente a la nada o haciendo una travesura"}".

Responde estrictamente en JSON:
{
  "captions": [
    {
      "text": "Texto del post en primera persona del animal con hashtags",
      "style": "Nombre del estilo (ej: Aristocrático, Caótico, Tierno, Filosofía de Siesta)"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            captions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  style: { type: Type.STRING },
                },
                required: ["text", "style"],
              },
            },
          },
          required: ["captions"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in generate-caption:", error);
    res.status(500).json({ error: error.message || "Error al generar leyenda con IA" });
  }
});

// Endpoint: AI Breed & Personality Analyzer
app.post("/api/gemini/analyze-pet", async (req, res) => {
  try {
    const { petName, species, physicalTraits, behaviors } = req.body;
    const ai = getGeminiClient();

    const prompt = `Realiza un análisis genético y de personalidad divertido para ${petName || "la mascota"} (${species === "cat" ? "Gato" : "Perro"}).
Rasgos físicos: "${physicalTraits || "Pelaje abundante, orejas atentas, ojos grandes"}".
Comportamientos típicos: "${behaviors || "Le gusta perseguir sombras, dormir al sol, pedir premios"}".

Genera un perfil cómico e ingenioso en español en formato JSON:
{
  "archetype": "Título de arquetipo (ej: El Lord de la Siesta, La Leyenda del Rayo Láser, El Detective Curioso)",
  "estimatedBreedMix": ["Raza estimada 1 (ej: 40% Labrador)", "Raza estimada 2 (ej: 30% Cazador de Sofás)", "30% Puro Amor"],
  "superpowers": ["Superpoder 1", "Superpoder 2"],
  "kryptonite": "Su única debilidad divertida (ej: La aspiradora, El empaque del premio abriéndose)",
  "compatibility": "Tipo de mejor amigo ideal"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            archetype: { type: Type.STRING },
            estimatedBreedMix: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            superpowers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            kryptonite: { type: Type.STRING },
            compatibility: { type: Type.STRING },
          },
          required: ["archetype", "estimatedBreedMix", "superpowers", "kryptonite", "compatibility"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in analyze-pet:", error);
    res.status(500).json({ error: error.message || "Error al analizar mascota" });
  }
});

// Endpoint: AI Pet Story Generator
app.post("/api/gemini/generate-story", async (req, res) => {
  try {
    const { petName, species, companionName, theme } = req.body;
    const ai = getGeminiClient();

    const prompt = `Escribe una microhistoria épica y divertida en español (máximo 180 palabras) protagonizada por ${petName} (${species === "cat" ? "un gato audaz" : "un perro intrépido"})${companionName ? ` y su amigo ${companionName}` : ""}.
Temática: ${theme || "Misión Secreta por el Galletón Perdido"}.

Estilo super entretenido con emojis. Responde en JSON:
{
  "title": "Título divertido de la historia",
  "story": "El texto de la microhistoria con emojis e imaginación",
  "moral": "Moraleja perruna/gatuna"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            story: { type: Type.STRING },
            moral: { type: Type.STRING },
          },
          required: ["title", "story", "moral"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in generate-story:", error);
    res.status(500).json({ error: error.message || "Error al generar historia con IA" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🐾 PawBook Server running on http://localhost:${PORT}`);
  });
}

startServer();
