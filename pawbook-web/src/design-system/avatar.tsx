import { TONES, type Tone } from "./tones";

type AvatarProps = {
  name: string;
  tone: Tone;
  size?: number;
  /** Anillo coral para la mascota activa o el perfil propio. */
  ring?: boolean;
  online?: boolean;
  className?: string;
};

/** Avatar con la inicial; decorativo, porque el nombre siempre aparece al lado. */
export function Avatar({
  name,
  tone,
  size = 40,
  ring = false,
  online = false,
  className = "",
}: AvatarProps) {
  const { bg, fg } = TONES[tone];
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full font-display font-extrabold ${
        ring ? "ring-2 ring-brand ring-offset-2 ring-offset-canvas" : ""
      } ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {name.charAt(0).toUpperCase()}
      {online && (
        <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-surface bg-success" />
      )}
    </span>
  );
}
