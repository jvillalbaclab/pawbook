"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CloseIcon, PawIcon, PinIcon } from "@/design-system/icons";
import { Photo } from "@/design-system/photo";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Skeleton,
  STATE_ACTION_CLASSES,
} from "@/design-system/states";
import { fmt } from "@/i18n/formatters";
import { getCandidates } from "@/lib/api";
import { useRequiredActivePet } from "@/stores/active-pet";
import { decide, INITIAL_DECK } from "./deck";

export function PawMatesView() {
  const t = useTranslations("pawmates");
  const activePet = useRequiredActivePet();
  const candidates = useQuery({ queryKey: ["candidates"], queryFn: getCandidates });
  const [deck, setDeck] = useState(INITIAL_DECK);

  if (candidates.isPending) {
    return (
      <LoadingState label={t("loading")} className="mx-auto max-w-md">
        <Skeleton className="h-[520px] rounded-[26px]" />
      </LoadingState>
    );
  }
  if (candidates.isError) {
    return (
      <ErrorState
        icon={<PawIcon size={44} />}
        title={t("errorTitle")}
        onRetry={() => candidates.refetch()}
      />
    );
  }

  const current = candidates.data[deck.index];
  const choose = (choice: "pass" | "interested") =>
    setDeck((state) => decide(state, candidates.data, choice));

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      {deck.match && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-panel border border-primary-line bg-primary-tint p-3.5"
        >
          <PawIcon size={24} className="text-brand" />
          <p className="flex-1 text-sm text-ink">
            {t.rich("match", {
              myPet: activePet.name,
              pet: deck.match.pet.name,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <Link href="/mensajes" className="text-sm font-bold text-primary-ink">
            {t("write")}
          </Link>
        </div>
      )}

      {current ? (
        <>
          <article className="overflow-hidden rounded-[26px] border border-line bg-surface">
            <Photo
              tone={current.pet.tone}
              alt={t("photoAlt", { name: current.pet.name, breed: current.pet.breed })}
              className="h-[330px]"
            >
              {current.highlyCompatible && (
                <span className="absolute top-3.5 left-3.5 rounded-control bg-success px-3 py-1.5 text-xs font-bold text-white">
                  {t("highlyCompatible")}
                </span>
              )}
              <span className="absolute top-3.5 right-3.5 rounded-control bg-white px-3 py-1.5 text-xs font-bold text-stone-900">
                {fmt.distanceKm(current.distanceKm)}
              </span>
            </Photo>
            <div className="flex flex-col gap-2.5 p-4">
              <div className="flex items-baseline gap-2">
                <h2 className="font-display text-[22px] font-extrabold text-ink">
                  {current.pet.name}
                </h2>
                <span className="text-[15px] text-muted">
                  {current.pet.ageLabel} · {current.pet.breed}
                </span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                <li className="rounded-chip bg-success-tint px-2.5 py-1 text-xs font-bold text-success-ink">
                  {t(`energy.${current.energy}`)}
                </li>
                <li className="rounded-chip bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-2">
                  {t(`size.${current.size}`)}
                </li>
                {current.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-chip bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-2"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </article>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              aria-label={t("pass", { name: current.pet.name })}
              onClick={() => choose("pass")}
              className="flex size-[60px] items-center justify-center rounded-full border border-line bg-surface text-ink-2 shadow-sm hover:bg-surface-2"
            >
              <CloseIcon size={24} />
            </button>
            <button
              type="button"
              onClick={() => choose("interested")}
              className="flex h-[60px] items-center gap-2 rounded-full bg-primary px-7 text-base font-bold text-white shadow-brand hover:bg-primary-hover"
            >
              <PawIcon size={22} />
              {t("interested")}
            </button>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<PinIcon size={44} />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <button
              type="button"
              onClick={() => setDeck(INITIAL_DECK)}
              className={STATE_ACTION_CLASSES.inverse}
            >
              {t("restart")}
            </button>
          }
        />
      )}
    </div>
  );
}
