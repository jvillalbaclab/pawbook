import type { ReactNode } from "react";
import { PawIcon } from "./icons";
import { TONES, type Tone } from "./tones";

type PhotoProps = {
  tone: Tone;
  /** Texto alternativo: describe la foto como lo haría la publicación real. */
  alt: string;
  className?: string;
  showPaw?: boolean;
  children?: ReactNode;
};

/**
 * Foto de ejemplo mientras no hay subida de imágenes real: bloque de color con una
 * huella. Cuando llegue el almacenamiento de imágenes se sustituye por next/image.
 */
export function Photo({ tone, alt, className = "", showPaw = true, children }: PhotoProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={`photo relative flex items-center justify-center ${className}`}
      style={{ background: TONES[tone].bg }}
    >
      {showPaw && <PawIcon size={88} style={{ color: TONES[tone].fg, opacity: 0.18 }} />}
      {children}
    </div>
  );
}
