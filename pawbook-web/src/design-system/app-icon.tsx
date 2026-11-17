/*
 * Icono de la app para la PWA (UI-007): huella blanca sobre el naranja de marca.
 * Se dibuja con ImageResponse (next/og) en app/icon.tsx y app/apple-icon.tsx; así no
 * hay PNG binarios que mantener a mano. Los colores repiten --brand de globals.css
 * porque ImageResponse no lee variables CSS.
 */

export const BRAND_COLOR = "#ff5a36";
export const APP_BACKGROUND = "#faf9f6";

/**
 * @param size lado del icono en píxeles.
 * @param maskable deja la huella dentro de la zona segura (80 %) y sin esquinas
 *   redondeadas: el sistema operativo aplica su propia máscara.
 */
export function AppIcon({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const paw = Math.round(size * (maskable ? 0.5 : 0.62));
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_COLOR,
        borderRadius: maskable ? 0 : Math.round(size * 0.22),
      }}
    >
      <svg width={paw} height={paw} viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
        <circle cx="6.5" cy="9.5" r="2" />
        <circle cx="10" cy="5.5" r="2" />
        <circle cx="14.5" cy="5.5" r="2" />
        <circle cx="18" cy="9.5" r="2" />
        <path d="M7.5 16.5c.8-3 2.6-4.8 4.5-4.8s3.7 1.8 4.5 4.8c.5 1.9-.8 3.5-2.6 3.5-.9 0-1.3-.5-1.9-.5s-1 .5-1.9.5c-1.8 0-3.1-1.6-2.6-3.5z" />
      </svg>
    </div>
  );
}
