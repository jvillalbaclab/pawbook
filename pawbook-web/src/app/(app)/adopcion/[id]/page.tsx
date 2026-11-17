import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AdoptionIcon, ChevronLeftIcon, VerifiedBadge } from "@/design-system/icons";
import { Photo } from "@/design-system/photo";
import { LoadingState, Skeleton } from "@/design-system/states";
import { RequestButton } from "@/features/adoption/request-button";
import { getAdoption, listAdoptions } from "@/lib/api";
import type { AdoptionStatus } from "@/lib/types";

const STEPS: AdoptionStatus[] = ["available", "in-process", "adopted"];

export async function generateMetadata(props: PageProps<"/adopcion/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const [listing, t] = await Promise.all([getAdoption(id), getTranslations("adoptionDetail")]);
  if (!listing) return { title: t("notFoundTitle") };
  return {
    title: t("metaTitle", { name: listing.name }),
    description: listing.story,
    openGraph: { title: t("ogTitle", { name: listing.name }), description: listing.story },
  };
}

/** Prerenderiza las fichas conocidas; una ficha nueva se resuelve en la petición. */
export async function generateStaticParams() {
  const listings = await listAdoptions();
  return listings.map((listing) => ({ id: listing.id }));
}

export default function AdoptionDetailPage(props: PageProps<"/adopcion/[id]">) {
  const t = useTranslations("adoptionDetail");
  return (
    <Suspense
      fallback={
        <LoadingState label={t("loading")} className="mx-auto max-w-[960px]">
          <Skeleton className="h-[440px] rounded-sheet" />
        </LoadingState>
      }
    >
      <AdoptionDetail params={props.params} />
    </Suspense>
  );
}

async function AdoptionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [listing, t, tAdoption, tCommon] = await Promise.all([
    getAdoption(id),
    getTranslations("adoptionDetail"),
    getTranslations("adoption"),
    getTranslations("common"),
  ]);
  if (!listing) notFound();

  const facts = [
    { label: t("species"), value: tAdoption(`speciesSex.${listing.species}.${listing.sex}`) },
    { label: t("age"), value: listing.ageLabel },
    { label: t("health"), value: listing.health },
    { label: t("temperament"), value: listing.temperament },
  ];

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-4">
      <Link
        href="/adopcion"
        className="flex w-fit items-center gap-1 text-sm font-semibold text-ink-2 hover:text-ink"
      >
        <ChevronLeftIcon size={18} />
        {t("back")}
      </Link>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_340px]">
        <Photo
          tone={listing.tone}
          alt={t("mainPhotoAlt", { name: listing.name })}
          className="h-[300px] rounded-sheet md:h-[440px]"
        />

        <section className="flex flex-col gap-4 rounded-sheet border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-display text-2xl font-extrabold text-ink">{listing.name}</h1>
            {listing.urgent && (
              <span className="rounded-chip bg-primary-tint px-2.5 py-1 text-xs font-bold text-primary-ink">
                {tAdoption("urgent")}
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
            <p className="mb-2 text-xs font-bold text-muted">{t("status")}</p>
            <ol className="grid grid-cols-3 gap-1.5">
              {STEPS.map((step) => (
                <li
                  key={step}
                  aria-current={step === listing.status ? "step" : undefined}
                  className={`rounded-chip px-1.5 py-2 text-center text-xs ${
                    step === listing.status
                      ? "bg-success font-bold text-white"
                      : "bg-surface-2 font-semibold text-muted"
                  }`}
                >
                  {tAdoption(`status.${step}`)}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex items-center gap-2.5 rounded-control border border-line p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-tint text-success-ink">
              <AdoptionIcon size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">{listing.organization.name}</p>
              <p className="flex items-center gap-1 text-xs font-semibold text-success-ink">
                <VerifiedBadge size={13} />
                {tCommon("verifiedOrganization")}
              </p>
            </div>
          </div>

          <RequestButton status={listing.status} organizationName={listing.organization.name} />
        </section>
      </div>
    </div>
  );
}
