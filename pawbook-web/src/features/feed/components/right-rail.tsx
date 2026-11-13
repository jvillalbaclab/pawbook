"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Avatar } from "@/design-system/avatar";
import { VerifiedBadge } from "@/design-system/icons";
import { Photo } from "@/design-system/photo";
import { getCandidates, getSuggestedPets, listAdoptions } from "@/lib/api";
import { useActivePet } from "@/stores/active-pet";

const ENERGY_LABEL = { low: "Energía baja", medium: "Energía media", high: "Energía alta" };

/** Tercera columna (≥ 1.280 px): PawMates cerca, adopción destacada y sugerencias. */
export function RightRail() {
  const activePet = useActivePet();
  const candidates = useQuery({ queryKey: ["candidates"], queryFn: getCandidates });
  const urgent = useQuery({
    queryKey: ["adoptions", "urgent"],
    queryFn: () => listAdoptions({ urgentOnly: true }),
  });
  const suggested = useQuery({
    queryKey: ["suggested", activePet.id],
    queryFn: () => getSuggestedPets(activePet.id),
  });
  const featured = urgent.data?.[0];

  return (
    <aside className="sticky top-6 hidden w-[300px] shrink-0 flex-col gap-4 self-start xl:flex">
      <section className="flex flex-col gap-3 rounded-[22px] border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-extrabold text-ink">PawMates cerca</h2>
          <Link href="/pawmates" className="text-[13px] font-bold text-primary-ink">
            Ver todos
          </Link>
        </div>
        {candidates.data?.map(({ pet, energy, distanceKm }) => (
          <div key={pet.id} className="flex items-center gap-2.5">
            <Avatar name={pet.name} tone={pet.tone} size={42} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">{pet.name}</p>
              <p className="truncate text-xs text-muted">
                {pet.breed} · {ENERGY_LABEL[energy]} · ≈ {distanceKm} km
              </p>
            </div>
          </div>
        ))}
      </section>

      {featured && (
        <section className="flex flex-col gap-3 rounded-[22px] border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-extrabold text-ink">En adopción</h2>
            <Link href="/adopcion" className="text-[13px] font-bold text-primary-ink">
              Ver todos
            </Link>
          </div>
          <Photo
            tone={featured.tone}
            alt={`Foto de ${featured.name}`}
            className="h-36 rounded-2xl"
            showPaw={false}
          >
            <span className="absolute top-2.5 left-2.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-orange-800">
              Urgente
            </span>
          </Photo>
          <div>
            <p className="font-display text-base font-extrabold text-ink">{featured.name}</p>
            <p className="text-[13px] text-muted">{featured.health}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-success-ink">
              <VerifiedBadge size={14} />
              {featured.organization.name}
            </p>
          </div>
          <Link
            href={`/adopcion/${featured.id}`}
            className="flex h-[42px] items-center justify-center rounded-[14px] bg-success text-sm font-bold text-white"
          >
            Ver ficha
          </Link>
        </section>
      )}

      {suggested.data && suggested.data.length > 0 && (
        <section className="flex flex-col gap-3 rounded-[22px] border border-line bg-surface p-4">
          <h2 className="font-display text-base font-extrabold text-ink">
            Sugeridas para {activePet.name}
          </h2>
          {suggested.data.map((pet) => (
            <Link key={pet.id} href={`/@${pet.handle}`} className="flex items-center gap-2.5">
              <Avatar name={pet.name} tone={pet.tone} size={40} />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">{pet.name}</span>
                <span className="block truncate text-xs text-muted">@{pet.handle}</span>
              </span>
            </Link>
          ))}
        </section>
      )}
    </aside>
  );
}
