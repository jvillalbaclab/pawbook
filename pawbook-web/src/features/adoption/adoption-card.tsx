import Link from "next/link";
import { Photo } from "@/design-system/photo";
import type { AdoptionListing } from "@/lib/types";

const SPECIES_SEX = {
  cat: { female: "Gata", male: "Gato" },
  dog: { female: "Perra", male: "Perro" },
} as const;

export function speciesLabel(listing: Pick<AdoptionListing, "species" | "sex">): string {
  return SPECIES_SEX[listing.species][listing.sex];
}

export function AdoptionCard({ listing }: { listing: AdoptionListing }) {
  const details = [speciesLabel(listing), listing.ageLabel, listing.sizeLabel]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={`/adopcion/${listing.id}`}
      className="overflow-hidden rounded-[20px] border border-line bg-surface transition-shadow hover:shadow-md"
    >
      <Photo
        tone={listing.tone}
        alt={`Foto de ${listing.name}`}
        className="h-[150px] lg:h-40"
        showPaw={false}
      >
        {listing.urgent && (
          <span className="absolute top-2.5 left-2.5 rounded-lg bg-white px-2.5 py-0.5 text-xs font-bold text-orange-800">
            Urgente
          </span>
        )}
        {listing.status === "in-process" && (
          <span className="absolute top-2.5 left-2.5 rounded-lg bg-white px-2.5 py-0.5 text-xs font-bold text-stone-700">
            En proceso
          </span>
        )}
      </Photo>
      <div className="px-3 pt-2.5 pb-3">
        <p className="font-display text-base font-extrabold text-ink">{listing.name}</p>
        <p className="text-[13px] text-muted">{details}</p>
        <p className="mt-1 text-xs font-semibold text-success-ink">{listing.organization.name}</p>
      </div>
    </Link>
  );
}
