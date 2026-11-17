import { ImageResponse } from "next/og";
import { AppIcon } from "@/design-system/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Icono de pantalla de inicio en iOS; iOS aplica su propia máscara, así que va a sangre. */
export default function AppleIcon() {
  return new ImageResponse(<AppIcon size={size.width} maskable />, size);
}
