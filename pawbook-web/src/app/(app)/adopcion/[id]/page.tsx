import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdoptionIcon, ChevronLeftIcon, VerifiedBadge } from "@/design-system/icons";
import { Photo } from "@/design-system/photo";
import { speciesLabel } from "@/features/adoption/adoption-card";
import { RequestButton } from "@/features/adoption/request-button";
import { getAdoption } from "@/lib/api";
import { ADOPTIONS } from "@/lib/sample-data";
import type { AdoptionStatus } from "@/lib/types";

const STEPS: { status: AdoptionStatus; label: string }[] = [
  { status: "available", label: "Disponible" },
  { status: "in-process", label: "En proceso" },
  { status: "adopted", label: "Adoptado" },
];

export async function generateMetadata(props: PageProps<"/adopcion/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const listing = await getAdoption(id);
  if (!listing) return { title: "Ficha no encontrada" };
  return {
    title: `${listing.name} en adopción`,
    description: listing.story,
    openGraph: { title: `Adopta a ${listing.name}`, description: listing.story },
  };
}

/** Prerenderiza las fichas conocidas; una ficha nueva se resuelve en la petición. */
export function generateStaticParams() {
  return ADOPTIONS.map((listing) => ({ id: listing.id }));
}

export default function AdoptionDetailPage(props: PageProps<"/adopcion/[id]">) {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className="mx-auto h-[440px] max-w-[960px] rounded-[24px] bg-surface-2"
        />
      }
    >
      <AdoptionDetail params={props.params} />
    </Suspense>
  );
}

async function AdoptionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getAdoption(id);
  if (!listing) notFound();

  const facts = [
    { label: "Especie", value: speciesLabel(listing) },
    { label: "Edad", value: listing.ageLabel },
    { label: "Salud", value: listing.health },
    { label: "Carácter", value: listing.temperament },
  ];

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-4">
      <Link
        href="/adopcion"
        className="flex w-fit items-center gap-1 text-sm font-semibold text-ink-2 hover:text-ink"
      >
        <ChevronLeftIcon size={18} />
        Volver a adopción
      </Link>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_340px]">
        <Photo
          tone={listing.tone}
          alt={`Foto principal de ${listing.name}`}
          className="h-[300px] rounded-[24px] md:h-[440px]"
        />

        <section className="flex flex-col gap-4 rounded-[24px] border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display text-2xl font-extrabold text-ink">{listing.name}</h1>
            {listing.urgent && (
              <span className="rounded-[10px] bg-primary-tint px-2.5 py-1 text-xs font-bold text-primary-ink">
                Urgente
              </span>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-2.5">
            {facts.map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-canvas px-3 py-2.5">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="text-sm font-bold text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="text-sm leading-relaxed text-ink-2">{listing.story}</p>

          <div>
            <p className="mb-2 text-xs font-bold text-muted">Estado</p>
            <ol className="grid grid-cols-3 gap-1.5">
              {STEPS.map((step) => (
                <li
                  key={step.status}
                  aria-current={step.status === listing.status ? "step" : undefined}
                  className={`rounded-[10px] px-1.5 py-2 text-center text-xs ${
                    step.status === listing.status
                      ? "bg-success font-bold text-white"
                      : "bg-surface-2 font-semibold text-muted"
                  }`}
                >
                  {step.label}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex items-center gap-2.5 rounded-[14px] border border-line p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-tint text-success-ink">
              <AdoptionIcon size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">{listing.organization.name}</p>
              <p className="flex items-center gap-1 text-xs font-semibold text-success-ink">
                <VerifiedBadge size={13} />
                Organización verificada
              </p>
            </div>
          </div>

          <RequestButton status={listing.status} organizationName={listing.organization.name} />
        </section>
      </div>
    </div>
  );
}
