import type { Metadata } from "next";
import { FollowSuggestions } from "@/features/auth/follow-suggestions";
import { OnboardingHeader } from "@/features/auth/onboarding-header";
import { OTHER_PETS } from "@/lib/sample-data";

export const metadata: Metadata = { title: "Mascotas para seguir" };

export default function FollowStepPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 px-5 pt-4">
      <OnboardingHeader step={3} backHref="/registro/mascota" />
      <div className="flex items-center gap-2.5 rounded-[14px] border border-warn-line bg-warn-tint px-3 py-2.5 text-[13px] text-warn-ink">
        <span className="flex-1">Verifica tu correo para poder publicar.</span>
        <button type="button" className="font-bold underline">
          Reenviar
        </button>
      </div>
      <div>
        <h1 className="font-display text-[26px] font-extrabold tracking-tight text-ink">
          ¿A quién quieres seguir?
        </h1>
        <p className="mt-1.5 text-sm text-ink-2">
          Sugerencias por especie y cerca de ti. Sigue al menos 5 para llenar tu feed.
        </p>
      </div>
      <FollowSuggestions pets={OTHER_PETS} />
    </div>
  );
}
