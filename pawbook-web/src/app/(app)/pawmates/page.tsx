import type { Metadata } from "next";
import { PinIcon } from "@/design-system/icons";
import { PawMatesView } from "@/features/pawmates/pawmates-view";

export const metadata: Metadata = { title: "PawMates" };

export default function PawMatesPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="mx-auto w-full max-w-md">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">PawMates</h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          <PinIcon size={14} />
          Hasta 5 km · ubicación aproximada, nunca la exacta
        </p>
      </header>
      <PawMatesView />
    </div>
  );
}
