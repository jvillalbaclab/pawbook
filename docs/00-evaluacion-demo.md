# Evaluación técnica del demo PawBook

| Campo | Valor |
|---|---|
| Objeto evaluado | `pawbook---red-social-de-perros-y-gatos/` (export de Google AI Studio) |
| Fecha | 2026-11-12 |
| Tamaño | 35 archivos, ~13.300 líneas TypeScript/TSX |
| Stack del demo | React 19 + Vite 6 + Tailwind 4 + motion · Express 4 + `@google/genai` · npm |
| Veredicto | **Prototipo de UI de alta fidelidad. Sirve como referencia visual y de dominio; no sirve como base de código de producción.** |

---

## 1. Qué es realmente el demo

El demo es una SPA que simula una red social completa. Todo el estado vive en el navegador (`localStorage`) y se inicializa con datos de ejemplo (`src/data/mockData.ts`, 1.050 líneas). El único backend es un servidor Express que expone 7 endpoints proxy hacia Gemini y sirve el frontend.

### 1.1 Inventario funcional

| Módulo (pestaña) | Archivo principal | Estado real |
|---|---|---|
| Inicio / Feed | `components/Feed/*` | Simulado. Publicaciones, reacciones temáticas (🐾 🦴 🐟 ❤️), comentarios y guardados en `localStorage`. Filtros tipo "Snapchat" sobre la foto. |
| Mi Mascota (perfil) | `components/Profile/PetProfileView.tsx` | Simulado. Un humano gestiona varias mascotas y alterna la "mascota activa". |
| PawMates | `components/PawMates/PawMatesView.tsx` (1.265 líneas) | Simulado. Swipe/match, "radar" con coordenadas ficticias y chat con **respuestas generadas por plantillas locales** (`generateContextualReply`), no hay otro humano al otro lado. |
| Traductor IA | `components/AITools/AIPetHub.tsx` (1.425 líneas) | Parcial. Llama a Gemini con **texto**. La grabación abre el micrófono pero **descarta el audio** y rellena una frase de ejemplo (`AIPetHub.tsx:222-228`). |
| Veterinarios | `components/Vets/VetsView.tsx` (1.024 líneas) | Simulado. Directorio, reserva de citas y "telemedicina" que es una respuesta clínica generada por Gemini. |
| Donaciones | `components/Donations/DonationsView.tsx` (1.550 líneas) | Simulado. Campañas, "verificación por videollamada", QR Nequi/Bizum y tarjeta; ningún pago real. |
| Mercadito | `components/Marketplace/*` | Simulado. Publicar, dar like, marcar vendido, contactar por teléfono. |
| Adopciones | `components/Adoption/AdoptionView.tsx` | Solo lectura sobre datos mock. |
| Retos y logros | `components/Challenges/*` | Simulado. Puntos, rachas, niveles e insignias calculados en el cliente. |
| Sonidos | `components/Soundboard/PetSoundboard.tsx` | Sintetizador WebAudio local (`utils/soundSynthesizer.ts`). |

### 1.2 Endpoints del servidor (`server.ts`)

| Endpoint | Propósito |
|---|---|
| `GET /api/health` | Healthcheck |
| `POST /api/gemini/translate-sound` | Mascota → humano |
| `POST /api/gemini/pet-conversation` | Conversación en primera persona con la mascota |
| `POST /api/gemini/human-to-pet` | Humano → "idioma" perro/gato |
| `POST /api/gemini/vet-telemed` | Orientación clínica veterinaria |
| `POST /api/gemini/generate-caption` | Pies de foto para publicaciones |
| `POST /api/gemini/analyze-pet` | Arquetipo/personalidad |
| `POST /api/gemini/generate-story` | Microhistoria |

---

## 2. Lo que vale la pena conservar

1. **Dirección visual y de producto.** Paleta cálida (`#FAF9F6`, `#FF5A36`), tipografías DM Sans / Plus Jakarta Sans, layout de 3 columnas en escritorio y barra inferior en móvil. Es una buena guía de diseño para el frontend definitivo.
2. **Conceptos diferenciadores.** La identidad "la mascota es la protagonista", las reacciones por especie, los filtros, el match para paseos y el traductor IA son ganchos de producto reales.
3. **Modelo de dominio inicial.** `src/types.ts` (341 líneas) es un buen borrador del lenguaje ubicuo: `PetProfile`, `Post`, `PlaydateCandidate`, `AdoptionPet`, `VetProfessional`, `DonationCampaign`, etc. Hay que refinarlo (ver §4), pero ahorra trabajo de descubrimiento.
4. **Prompts de IA.** Los 7 prompts con `responseSchema` son reutilizables como punto de partida.

---

## 3. Hallazgos

Severidad: **Crítico** (bloquea producción o genera riesgo legal), **Alto** (rehacer), **Medio** (corregir al portar).

### 3.1 Arquitectura

| # | Severidad | Hallazgo | Evidencia |
|---|---|---|---|
| A1 | Crítico | No existe backend de dominio: sin base de datos, sin autenticación, sin usuarios reales. Todo vive en `localStorage` del navegador. | `App.tsx:47-162` |
| A2 | Alto | `App.tsx` es un "god component": 14 estados globales, toda la lógica de negocio (puntos, niveles, donaciones) y *prop drilling* a 10 vistas. | `App.tsx:46-393` |
| A3 | Alto | Componentes de 1.000-1.550 líneas que mezclan UI, estado, lógica y datos. Imposibles de testear. | `DonationsView.tsx`, `AIPetHub.tsx`, `PawMatesView.tsx`, `VetsView.tsx` |
| A4 | Alto | Sin enrutador: la navegación es un `useState<TabType>`. No hay URLs para perfiles, posts o campañas; nada se puede compartir ni indexar, inaceptable en una red social. | `App.tsx:114` |
| A5 | Alto | La lógica de negocio sensible (puntos, nivel, montos recaudados) se calcula en el cliente y se puede manipular desde la consola. | `App.tsx:176-219, 590-638` |
| A6 | Medio | Backend acoplado al frontend: Express monta Vite como middleware. No se puede desplegar ni consumir la API de forma independiente (requisito para la app móvil). | `server.ts:405-419` |
| A7 | Medio | Imágenes subidas se convierten a base64 y se guardan en `localStorage` (límite ~5 MB). | `PublishItemModal.tsx:80`, `DonationsView.tsx:269` |

### 3.2 Seguridad y costes

| # | Severidad | Hallazgo | Evidencia |
|---|---|---|---|
| S1 | Crítico | Endpoints de IA públicos, sin autenticación ni *rate limiting*: cualquiera puede consumir la cuota de Gemini. | `server.ts:36-399` |
| S2 | Alto | *Prompt injection*: la entrada del usuario se interpola directamente en el prompt sin delimitar ni validar. | `server.ts:42-45`, todos los endpoints |
| S3 | Alto | Sin validación de entrada (no hay esquema), `express.json({ limit: "10mb" })`. | `server.ts:12` |
| S4 | Medio | Se devuelve `error.message` del proveedor al cliente (fuga de detalles internos). | `server.ts:96` y siguientes |
| S5 | Medio | Modelo fijado en el código (`gemini-3.8-flash`) en 7 lugares; sin configuración ni *fallback*. | `server.ts` |
| S6 | Medio | Se solicita el micrófono y el audio se descarta: el usuario cree que su grabación se analiza. Problema de transparencia y privacidad. | `AIPetHub.tsx:196-228` |

### 3.3 Producto y riesgo legal

| # | Severidad | Hallazgo |
|---|---|---|
| P1 | Crítico | **Donaciones**: la UI afirma "Auditamos por videollamada y clínica veterinaria", "Filtro 100% Real" y pago directo a clínica. Recaudar dinero de terceros exige pasarela de pagos, KYC de fundaciones y cumplimiento normativo. Mostrar esas afirmaciones sin proceso real es publicidad engañosa. |
| P2 | Crítico | **Telemedicina IA**: el endpoint `vet-telemed` responde "como" una veterinaria con nombre propio y da orientación clínica. Requiere descargo explícito, revisión regulatoria y, si se ofrece telemedicina real, profesionales verificados. |
| P3 | Alto | **Alcance**: 10 módulos para un MVP. Varios (donaciones, veterinarios, mercadito) son negocios en sí mismos con requisitos regulatorios propios. Hay que recortar (ver PRD §6). |
| P4 | Alto | **Chat falso**: PawMates responde con plantillas; el valor real (conectar dueños cercanos) no está probado. |
| P5 | Medio | **Mercado objetivo indefinido**: datos en Madrid y "€", pero el QR menciona Nequi (Colombia) y Bizum (España). Afecta moneda, pasarela, idioma y legislación de datos. |

### 3.4 Calidad de ingeniería

- Sin tests, sin linter (solo `tsc --noEmit`), sin CI.
- `tsconfig.json` sin `strict: true`.
- Sin i18n: todos los textos en español embebidos en JSX.
- Imágenes servidas desde URLs externas sin control (`referrerPolicy="no-referrer"`).
- `package.json` con nombre `react-example` y README genérico de AI Studio.
- No se ejecutó el demo ni `tsc` durante esta evaluación; los hallazgos provienen de lectura de código.

---

## 4. Ajustes al modelo de dominio

El demo confunde "humano" y "mascota". Hay que separar:

- **Cuenta (User)**: el humano. Se autentica, paga, modera y es responsable legal.
- **Mascota (Pet)**: perfil público que publica y es seguido. Pertenece a una cuenta (1:N).
- **Organización (Organization)**: refugio, fundación o clínica verificada. Publica adopciones y campañas.

Otros ajustes: `Post.petName/petAvatar` están desnormalizados (se resuelven por `petId`); `timestamp: "Hace un instante"` es texto de UI y debe ser ISO-8601; `ReactionCounts` debe venir del proveedor de feeds, no almacenarse a mano.

---

## 5. Recomendación

**Reescribir con arquitectura nueva y usar el demo como especificación visual.**

| Acción | Detalle |
|---|---|
| Conservar | Sistema visual, *copy*, flujos de UX, `types.ts` como borrador, prompts de IA. |
| Reescribir | Todo el estado, la navegación, el backend y la integración con IA. |
| Posponer | Donaciones, telemedicina y mercadito hasta tener base legal (ver PRD). |
| Eliminar | Respuestas de chat simuladas, grabación falsa, afirmaciones de verificación no respaldadas. |

Los documentos siguientes desarrollan esta recomendación:

- [01-PRD.md](01-PRD.md): producto, alcance y fases.
- [02-SRS.md](02-SRS.md): requisitos formales (IEEE 830).
- [03-arquitectura.md](03-arquitectura.md): arquitectura técnica con GetStream, TypeScript, Node.js y Bun.
