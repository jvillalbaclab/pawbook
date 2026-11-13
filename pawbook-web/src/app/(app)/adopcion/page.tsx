import type { Metadata } from "next";
import { VerifiedBadge } from "@/design-system/icons";
import { AdoptionBrowser } from "@/features/adoption/adoption-browser";
import { listAdoptions } from "@/lib/api";

export const metadata: Metadata = {
  title: "Adopción",
  description: "Perros y gatos en adopción de refugios y fundaciones verificadas.",
};

export default async function AdoptionPage() {
  const listings = await listAdoptions();
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">
          Adopción
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-success-ink">
          <VerifiedBadge size={16} />
          Solo refugios y fundaciones verificadas
        </p>
      </header>
      <AdoptionBrowser listings={listings} />
    </div>
  );
}
