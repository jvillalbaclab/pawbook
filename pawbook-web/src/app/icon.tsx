import { ImageResponse } from "next/og";
import { AppIcon } from "@/design-system/app-icon";

/** Iconos de la PWA: /icon/192, /icon/512 y /icon/maskable (los referencia manifest.ts). */
const ICONS = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  maskable: { size: 512, maskable: true },
} as const;

type IconId = keyof typeof ICONS;

export function generateImageMetadata() {
  return (Object.keys(ICONS) as IconId[]).map((id) => ({
    id,
    contentType: "image/png",
    size: { width: ICONS[id].size, height: ICONS[id].size },
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const icon = ICONS[(await id) as IconId] ?? ICONS["512"];
  return new ImageResponse(<AppIcon size={icon.size} maskable={icon.maskable} />, {
    width: icon.size,
    height: icon.size,
  });
}
