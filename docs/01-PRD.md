# PRD — PawBook

| Campo | Valor |
|---|---|
| Producto | PawBook, red social de perros y gatos |
| Versión del documento | 1.1 (borrador para revisión de socios) |
| Fecha | 2026-11-13 |
| Estado | En revisión |
| Cambios en 1.1 | Alineado con el sistema de diseño de [`docs/diseno/`](diseno/index.html): tema oscuro, PWA, seguir refugios, adopción en el feed, desactivar PawMates, compatibilidad, apelar la moderación y responsable visible. |
| Documentos relacionados | [00-evaluacion-demo.md](00-evaluacion-demo.md) · [02-SRS.md](02-SRS.md) · [03-arquitectura.md](03-arquitectura.md) · [Diseño](diseno/index.html) |

---

## 1. Visión

PawBook es la red social donde **la mascota es la protagonista**. Los dueños crean perfiles para sus perros y gatos, comparten su día a día, conectan con otras mascotas cercanas para pasear y jugar, y apoyan la adopción responsable.

**Declaración de posicionamiento.** Para dueños de perros y gatos que ya publican a sus mascotas en Instagram o TikTok pero quieren una comunidad propia, PawBook es una red social centrada en la mascota que, a diferencia de las redes generalistas, organiza el contenido por especie, conecta con mascotas cercanas y convierte la comunidad en apoyo real a la adopción.

## 2. Problema

| Problema | Evidencia o hipótesis | Cómo lo resuelve PawBook |
|---|---|---|
| El contenido de mascotas se pierde entre contenido general en redes generalistas. | Hipótesis H1, a validar con entrevistas. | Feed exclusivo de mascotas, perfiles por mascota, reacciones por especie. |
| Encontrar compañeros de paseo o juego compatibles cerca es difícil. | Hipótesis H2. | PawMates: descubrimiento por cercanía, tamaño y energía, con chat real. |
| Los refugios tienen poca visibilidad y las publicaciones de adopción en redes generalistas duran poco. | Hipótesis H3. | Sección de adopción con organizaciones verificadas. |

> Las hipótesis H1-H3 no están validadas. Ver §11 "Validación previa".

## 3. Usuarios

### 3.1 Personas

| Persona | Descripción | Necesidad principal | Fase |
|---|---|---|---|
| **Laura, dueña entusiasta** (25-40) | Publica a su gato a diario, sigue cuentas de mascotas. | Mostrar a su mascota y recibir interacción. | MVP |
| **Andrés, dueño activo** (25-45) | Pasea a su perro mestizo en el parque, busca compañía para el perro. | Conocer perros compatibles cerca. | MVP |
| **Refugio Patitas** (organización) | Fundación pequeña con 30 animales en adopción. | Visibilidad y solicitudes de adopción serias. | MVP |
| **Moderador PawBook** (interno) | Equipo de operaciones. | Retirar contenido inapropiado y gestionar denuncias. | MVP |
| **Veterinario** | Clínica que quiere captar clientes. | Directorio y citas. | Fase 3 |

### 3.2 Roles del sistema

`visitante` (sin sesión) · `usuario` (dueño) · `organización` (refugio/fundación verificada) · `moderador` · `administrador`.

## 4. Objetivos y métricas

| Objetivo | Métrica | Meta a 90 días del lanzamiento |
|---|---|---|
| Activación | % de registros que crean una mascota y publican en las primeras 24 h | ≥ 40 % |
| Retención | Retención D30 de usuarios activados | ≥ 20 % |
| Engagement | Publicaciones por usuario activo semanal | ≥ 2 |
| Red | % de usuarios activos que siguen a ≥ 5 mascotas | ≥ 60 % |
| PawMates | % de matches que intercambian ≥ 3 mensajes | ≥ 30 % |
| Adopción | Solicitudes de adopción enviadas por mes | Línea base en mes 1 |
| Salud | Contenido denunciado resuelto en < 24 h | ≥ 95 % |

**Métrica norte (North Star):** mascotas activas semanales (mascotas con al menos una publicación o interacción en la semana).

## 5. Principios de producto

1. **La mascota habla, el humano responde.** El autor visible es la mascota; el humano es el responsable.
2. **Web primero, móvil después, mismo backend.** Toda funcionalidad se expone por API pública versionada. La web no tiene privilegios que la app móvil no tenga.
3. **Nada simulado en producción.** Si una función no es real (chat, verificación, traducción de audio), no se muestra.
4. **Confianza antes que dinero.** Ninguna funcionalidad que mueva dinero se lanza sin base legal y proveedor de pagos.

## 6. Alcance por fases

### 6.1 Resumen

| Módulo | Demo | MVP (Fase 1) | Fase 2 | Fase 3 | Notas |
|---|:-:|:-:|:-:|:-:|---|
| Cuentas y autenticación | ✗ | ✅ | | | Correo + Google. Apple en Fase 2 (requisito de App Store). |
| Perfiles de mascota (multi-mascota) | Mock | ✅ | | | |
| Seguir mascotas y refugios verificados | ✗ | ✅ | | | Sugerencias en onboarding y en el feed. |
| Feed: publicar foto/texto, reacciones, comentarios, guardados | Mock | ✅ | Video corto | | Feeds de GetStream. |
| Seguir mascotas, feed de seguidos y "Para ti" | ✗ | ✅ | Ranking personalizado | | |
| Notificaciones en la app | ✗ | ✅ | Push (móvil) | | |
| Búsqueda de mascotas y hashtags | Parcial | ✅ básica | Avanzada | | |
| Moderación y denuncias | ✗ | ✅ | | | GetStream Moderation + panel interno. |
| PawMates: descubrimiento + match + chat real | Mock | ✅ | Mapa y quedadas | | Chat de GetStream. |
| Adopciones (organizaciones verificadas) | Mock | ✅ | | | Sin pagos. |
| Tema claro y oscuro · PWA instalable | ✗ | ✅ | | | Según el sistema de diseño. |
| IA: generador de pies de foto | Real | ✅ | | | |
| IA: traductor de sonidos (audio real) | Falso | | ✅ | | Etiquetado como entretenimiento. |
| Filtros de foto | Mock | | ✅ | | |
| Retos, puntos e insignias | Mock | | ✅ | | Calculados en servidor. |
| Mercadito | Mock | | | ✅ | Requiere política de artículos prohibidos. |
| Directorio de veterinarios y citas | Mock | | | ✅ | |
| Telemedicina (video con profesional real) | Falso | | | ✅ | GetStream Video. IA solo como triaje con descargo. |
| Donaciones | Falso | | | ✅ | Requiere pasarela, KYC y revisión legal. |
| Soundboard | Real | | ✗ | | Se integra al traductor o se elimina. |
| App móvil | ✗ | | ✅ | | Consume la misma API. |

### 6.2 Fuera de alcance del MVP (no-objetivos)

- Pagos de cualquier tipo, incluidas donaciones y compraventa.
- Telemedicina y orientación clínica por IA.
- Transmisiones en vivo e historias efímeras.
- Monetización por publicidad.
- Aplicación móvil nativa (el backend sí queda listo).

## 7. Requisitos funcionales del MVP (historias de usuario)

Prioridad MoSCoW. Los identificadores `FR-*` remiten al [SRS](02-SRS.md).

### Épica E1 — Cuenta y mascotas

| ID | Historia | Criterios de aceptación | Prioridad | SRS |
|---|---|---|---|---|
| US-01 | Como visitante quiero registrarme con correo o Google para usar PawBook. | Correo, contraseña y fecha de nacimiento (verifica la edad mínima de Q2) y aceptación de términos. Recibo un enlace de verificación; sin verificar no puedo publicar y veo un aviso con "Reenviar". Google crea la cuenta en un paso. | M | FR-AUTH-001..006 |
| US-02 | Como usuario quiero crear el perfil de mi mascota. | Nombre, especie (perro/gato), raza, fecha de nacimiento aproximada, sexo, avatar y bio. Se genera un `@handle` único editable. | M | FR-PET-001..003 |
| US-03 | Como usuario con varias mascotas quiero cambiar la mascota activa. | El selector muestra mis mascotas; lo que publico, comento o reacciono queda firmado por la mascota activa. | M | FR-PET-005 |
| US-04 | Como usuario quiero editar o archivar una mascota. | Al archivar, su perfil deja de ser visible y sus publicaciones se ocultan. | S | FR-PET-004, 006 |
| US-05 | Como usuario quiero eliminar mi cuenta y mis datos. | La eliminación se completa en ≤ 30 días e incluye datos en GetStream. | M | FR-AUTH-008 |
| US-06 | Como usuario quiero decidir si mi nombre aparece en el perfil de mi mascota. | Por defecto se muestra "Responsable: <nombre de pila>"; puedo ocultarlo en ajustes. Nunca se muestran apellidos ni contacto. | S | FR-PET-008 |

### Épica E2 — Feed social

| ID | Historia | Criterios de aceptación | Prioridad | SRS |
|---|---|---|---|---|
| US-10 | Como usuario quiero publicar hasta 10 fotos con texto, ubicación y estado de ánimo. | Imágenes JPEG/PNG/WebP/HEIC ≤ 15 MB; texto ≤ 2.200 caracteres; aparece en mi perfil y en el feed de mis seguidores en < 5 s. | M | FR-FEED-001..004 |
| US-11 | Como usuario quiero reaccionar con 🐾 ❤️ 🦴 🐟. | Una reacción por mascota y publicación; cambiarla reemplaza la anterior; los contadores se actualizan en tiempo real. | M | FR-FEED-006 |
| US-12 | Como usuario quiero comentar y responder comentarios. | Hilos de un nivel; el autor de la publicación recibe notificación. | M | FR-FEED-007 |
| US-13 | Como usuario quiero seguir mascotas y ver sus publicaciones. | Feed "Siguiendo" cronológico; feed "Para ti" con contenido popular reciente. En el onboarding recibo sugerencias por especie y ciudad, con la meta de seguir 5 y opción de omitir; el feed sigue sugiriendo en la columna lateral. | M | FR-SOC-001..004, UI-008 |
| US-14 | Como usuario quiero guardar publicaciones. | Colección privada "Guardados". | S | FR-FEED-008 |
| US-15 | Como usuario quiero que la IA me sugiera pies de foto. | 3 sugerencias en < 6 s; máximo 20 por día por usuario. | S | FR-AI-001..003 |
| US-16 | Como usuario quiero editar o eliminar mis publicaciones. | La edición marca "editado"; la eliminación la retira de todos los feeds. | M | FR-FEED-005 |
| US-17 | Como visitante quiero ver un perfil o publicación pública por URL. | Página indexable con metadatos Open Graph. | S | FR-FEED-010 |
| US-18 | Como usuario quiero usar PawBook en modo oscuro e instalarla en mi móvil. | El tema sigue al sistema y puedo fijarlo a mano; la web se instala como PWA. | M | UI-006, UI-007 |
| US-19 | Como usuario quiero seguir refugios verificados. | Sus publicaciones y fichas nuevas aparecen en "Siguiendo". | S | FR-SOC-005 |

### Épica E3 — Notificaciones y búsqueda

| ID | Historia | Criterios de aceptación | Prioridad | SRS |
|---|---|---|---|---|
| US-20 | Como usuario quiero saber quién reaccionó, comentó o siguió a mi mascota. | Centro de notificaciones con contador de no leídas en tiempo real. | M | FR-NOT-001..003 |
| US-21 | Como usuario quiero buscar mascotas por nombre, `@handle` o raza. | Resultados en < 1 s. | M | FR-SRCH-001 |
| US-22 | Como usuario quiero explorar por hashtag. | Página de hashtag con publicaciones recientes. | C | FR-SRCH-002 |

### Épica E4 — PawMates

| ID | Historia | Criterios de aceptación | Prioridad | SRS |
|---|---|---|---|---|
| US-30 | Como usuario quiero activar PawMates para mi mascota indicando tamaño, energía y radio. | Ubicación aproximada (precisión reducida a ~1 km); puedo desactivarlo en cualquier momento. | M | FR-PM-001, 002 |
| US-31 | Como usuario quiero ver mascotas compatibles cerca y marcar interés. | Lista paginada por distancia y compatibilidad, con etiqueta "Muy compatible"/"Compatible" y distancia redondeada ("≈ 2 km"); nunca se muestra la ubicación exacta. | M | FR-PM-003, 004, 009 |
| US-32 | Como usuario quiero chatear cuando hay match mutuo. | Canal 1:1 con mensajes en tiempo real, indicador de escritura, imágenes y confirmación de lectura. | M | FR-PM-005, 006 |
| US-33 | Como usuario quiero bloquear o denunciar a otro usuario. | El bloqueo oculta perfiles mutuamente y cierra el canal. | M | FR-MOD-003 |
| US-34 | Como usuario quiero desactivar PawMates cuando quiera. | Dejo de aparecer como candidato y se borra mi ubicación; mis matches se conservan. | M | FR-PM-008 |

### Épica E5 — Adopciones

| ID | Historia | Criterios de aceptación | Prioridad | SRS |
|---|---|---|---|---|
| US-40 | Como refugio quiero solicitar verificación como organización. | Formulario con documento legal; un administrador aprueba o rechaza. | M | FR-ORG-001, 002 |
| US-41 | Como refugio verificado quiero publicar animales en adopción. | Ficha con fotos, especie, edad, salud y urgencia; estados disponible → en proceso → adoptado. | M | FR-ADO-001, 002 |
| US-42 | Como usuario quiero filtrar animales en adopción y enviar una solicitud. | Filtros por especie, ciudad y urgencia; la solicitud llega al refugio por chat y correo. | M | FR-ADO-003, 004 |
| US-43 | Como refugio quiero que mis fichas nuevas lleguen a mis seguidores. | La ficha aparece como "Nuevo en adopción" en el feed de quienes siguen al refugio y en la columna lateral "En adopción". | S | FR-ADO-005, UI-008 |

### Épica E6 — Seguridad y moderación

| ID | Historia | Criterios de aceptación | Prioridad | SRS |
|---|---|---|---|---|
| US-50 | Como usuario quiero denunciar publicaciones, comentarios, mensajes y perfiles. | Motivos predefinidos; confirmación al enviar. | M | FR-MOD-001 |
| US-51 | Como moderador quiero revisar denuncias y contenido marcado automáticamente. | Cola priorizada; acciones: ocultar, eliminar, advertir, suspender. | M | FR-MOD-002, 004 |
| US-52 | Como plataforma quiero bloquear automáticamente imágenes y textos dañinos. | Filtro automático antes de publicar (maltrato animal, desnudez, odio, spam). | M | FR-MOD-005 |
| US-53 | Como usuario quiero pedir revisión si la moderación automática bloquea mi publicación por error. | Botón "Pedir revisión"; se conserva mi texto; recibo el resultado como notificación. | S | FR-MOD-006 |

## 8. Requisitos no funcionales clave

Detallados en el SRS §3.3-3.5. Resumen:

- **Rendimiento:** p95 de la API ≤ 300 ms (excluye IA); primer contenido del feed ≤ 2,5 s en 4G.
- **Disponibilidad:** 99,5 % mensual para la API en el MVP.
- **Seguridad:** OWASP ASVS nivel 2; secretos de GetStream y Gemini solo en servidor.
- **Privacidad:** cumplimiento del marco de protección de datos del mercado elegido (RGPD o Ley 1581 de Colombia).
- **Accesibilidad:** WCAG 2.2 AA.
- **Agnosticismo de cliente:** API REST versionada (`/v1`) documentada con OpenAPI 3.1, autenticación por *bearer token* compatible con web y móvil.

## 9. Experiencia y diseño

- La referencia visual es el sistema de diseño de [`docs/diseno/`](diseno/index.html): 18 pantallas (móvil, desktop, onboarding y catálogo de estados), cada una en tema claro y oscuro. Sustituye al demo, que se conserva solo como antecedente.
- Las pantallas que el plan necesita y aún no tienen diseño (login, recuperación de contraseña, notificaciones, búsqueda, detalle de publicación, match, ajustes, paneles de organización y moderación) se diseñan antes de construirlas, dentro de su hito.
- Toda vista tiene URL propia: `/@{handle}`, `/p/{postId}`, `/adopcion/{id}`, `/pawmates`, `/mensajes/{channelId}`.
- Responsive desde 360 px. PWA instalable en la Fase 1 como puente hasta la app móvil.

## 10. Dependencias

| Dependencia | Uso | Riesgo |
|---|---|---|
| GetStream Activity Feeds | Feeds, reacciones, comentarios, seguidores, notificaciones | Coste por MAU y dependencia de proveedor. Mitigado con capa de adaptadores (ver arquitectura, ADR-003). |
| GetStream Chat | Chat de PawMates y solicitudes de adopción | Ídem. |
| GetStream Moderation | Moderación automática de texto e imágenes | Cobertura en español a validar en el spike. |
| Google Gemini | IA generativa | Coste por uso; mitigado con cuotas por usuario. |
| Almacenamiento de objetos + CDN | Imágenes | Bajo. |

## 11. Validación previa (antes de construir el MVP completo)

1. **Entrevistas** (técnica Mom Test) con 15 dueños y 5 refugios para validar H1-H3.
2. **Spike técnico de 1 semana** con GetStream: feeds v3, chat, moderación en español y costes estimados para 10 k MAU.
3. **Decisión de mercado** inicial (ver §13), que fija idioma, moneda y marco legal.

## 12. Plan de lanzamiento

| Hito | Contenido | Criterio de salida |
|---|---|---|
| M0 — Fundaciones | Repositorios de API y web, CI, auth, perfiles de mascota, integración base con GetStream | Usuario crea cuenta y mascota en staging. |
| M1 — Núcleo social | Feed, reacciones, comentarios, seguir, notificaciones, búsqueda | Flujo completo publicar → notificar en staging. |
| M2 — PawMates y adopción | Descubrimiento, match, chat, organizaciones, adopciones | Dos usuarios reales chatean tras un match. |
| M3 — Confianza | Moderación, denuncias, panel interno, eliminación de cuenta | Checklist de seguridad y privacidad aprobado. |
| Beta cerrada | 200 usuarios invitados en una ciudad | Métricas de §4 medidas durante 4 semanas. |
| Lanzamiento público | | Activación ≥ 30 % en la beta. |

## 13. Preguntas abiertas

| # | Pregunta | Responsable | Impacto |
|---|---|---|---|
| Q1 | ¿Mercado inicial: España o Colombia? (El demo mezcla €, Madrid, Nequi y Bizum.) | Socios | Idioma, moneda, ley de datos, pasarela de pagos de la Fase 3 |
| Q2 | ¿Edad mínima de registro (14, 16 o 18 años)? El diseño usa el marcador `[EDAD MÍNIMA]`. | Socios + asesoría legal | Consentimiento y moderación |
| Q3 | ¿Modelo de negocio (freemium, comisiones del mercadito, perfiles destacados para refugios)? | Socios | Prioridad de la Fase 3 |
| Q4 | ¿Plan de GetStream (Maker/Startup vs. pago)? | Socios | Coste y límites |
| Q5 | ¿Se permite que una mascota tenga varios dueños (co-gestión)? | Producto | Modelo de datos |

## 14. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Arranque en frío (red vacía) | Alta | Alto | Lanzar por ciudad; sembrar con refugios y creadores de contenido de mascotas. |
| Coste de GetStream al crecer | Media | Alto | Adaptadores intercambiables; monitorizar MAU; negociar plan startup. |
| Contenido de maltrato animal | Media | Alto | Moderación automática + humana desde el día 1. |
| Riesgo legal en donaciones y telemedicina | Alta si se lanza sin base | Crítico | Fuera del MVP; requiere asesoría legal previa. |
| Alcance excesivo (10 módulos del demo) | Alta | Alto | Este PRD recorta a 6 épicas para el MVP. |
