import type { ReactNode, SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

/** Base común: trazo de 24×24 que hereda el color del texto. Siempre decorativo. */
function Stroke({
  size = 22,
  strokeWidth = 2,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

const PAW_PADS = (
  <>
    <circle cx="6.5" cy="9.5" r="2" />
    <circle cx="10" cy="5.5" r="2" />
    <circle cx="14.5" cy="5.5" r="2" />
    <circle cx="18" cy="9.5" r="2" />
  </>
);
const PAW_PALM =
  "M7.5 16.5c.8-3 2.6-4.8 4.5-4.8s3.7 1.8 4.5 4.8c.5 1.9-.8 3.5-2.6 3.5-.9 0-1.3-.5-1.9-.5s-1 .5-1.9.5c-1.8 0-3.1-1.6-2.6-3.5z";

/** Huella: rellena por defecto (logo, reacción activa); con outline=true, de trazo. */
export function PawIcon({
  size = 22,
  outline = false,
  ...rest
}: IconProps & { outline?: boolean }) {
  if (outline) {
    return (
      <Stroke size={size} {...rest}>
        {PAW_PADS}
        <path d={PAW_PALM} />
      </Stroke>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...rest}
    >
      {PAW_PADS}
      <path d={PAW_PALM} />
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
  </Stroke>
);
export const SearchIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </Stroke>
);
export const PlusIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.4} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
);
export const BellIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </Stroke>
);
export const MessageIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 5h16v11H9l-5 4z" />
  </Stroke>
);
export const AdoptionIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 11l8-7 8 7v9H4z" />
    <path d="M12 17.5s-3-1.8-3-3.8a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 2-3 3.8-3 3.8z" />
  </Stroke>
);
export const BookmarkIcon = ({ filled = false, ...p }: IconProps & { filled?: boolean }) => (
  <Stroke fill={filled ? "currentColor" : "none"} {...p}>
    <path d="M7 4h10v16l-5-4-5 4z" />
  </Stroke>
);
export const HeartIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </Stroke>
);
export const BoneIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M8.5 15.5l7-7" />
    <path d="M8.5 15.5a2.3 2.3 0 1 1-3 3 2.3 2.3 0 1 1 0-3.2 2.3 2.3 0 1 1 3.2 0" />
    <path d="M15.5 8.5a2.3 2.3 0 1 1 3-3 2.3 2.3 0 1 1 0 3.2 2.3 2.3 0 1 1-3.2 0" />
  </Stroke>
);
export const FishIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 12c2.8-3.6 6.5-5 10.5-4 2.3.6 4.2 2 5.5 4-1.3 2-3.2 3.4-5.5 4-4 1-7.7-.4-10.5-4z" />
    <path d="M19 12l2.5-3v6z" />
  </Stroke>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.2} {...p}>
    <path d="M6 9l6 6 6-6" />
  </Stroke>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.2} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Stroke>
);
export const MoreIcon = ({ size = 20, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...rest}
  >
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);
export const PinIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" />
    <circle cx="12" cy="10" r="2" />
  </Stroke>
);
export const SparklesIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
    <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
  </Stroke>
);
export const ImageIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="3" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M20.5 16l-5-5-8 8" />
  </Stroke>
);
export const SendIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.2} {...p}>
    <path d="M5 12h13M13 6l6 6-6 6" />
  </Stroke>
);
export const CloseIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.4} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Stroke>
);
export const FiltersIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Stroke>
);
export const SunIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
  </Stroke>
);
export const MoonIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </Stroke>
);
export const CheckIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.4} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Stroke>
);

/** Insignia de organización verificada: con nombre accesible propio. */
export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Organización verificada"
    >
      <circle cx="12" cy="12" r="10" fill="var(--success)" />
      <path
        d="M8 12.5l2.7 2.7L16 9.8"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
