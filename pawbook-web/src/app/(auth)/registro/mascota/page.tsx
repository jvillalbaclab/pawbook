import type { Metadata } from "next";
import { OnboardingHeader } from "@/features/auth/onboarding-header";
import { PetForm } from "@/features/auth/pet-form";

export const metadata: Metadata = { title: "Presenta a tu mascota" };

export default function PetStepPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-5 px-5 py-4">
      <OnboardingHeader step={2} backHref="/registro" />
      <div>
        <h1 className="font-display text-[26px] font-extrabold tracking-tight text-ink">
          Presenta a tu mascota
        </h1>
        <p className="mt-1.5 text-sm text-ink-2">
          Será la autora de todo lo que publiques. Podrás añadir más mascotas después.
        </p>
      </div>
      <PetForm />
    </div>
  );
}
