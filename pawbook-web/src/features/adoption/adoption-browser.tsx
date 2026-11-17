"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AdoptionIcon } from "@/design-system/icons";
import { EmptyState } from "@/design-system/states";
import { filterAdoptions } from "@/lib/api";
import type { AdoptionFilter, AdoptionListing, Species } from "@/lib/types";
import { AdoptionCard } from "./adoption-card";

const SPECIES_OPTIONS: {
  value: Species | undefined;
  labelKey: "filterAll" | "filterDogs" | "filterCats";
}[] = [
  { value: undefined, labelKey: "filterAll" },
  { value: "dog", labelKey: "filterDogs" },
  { value: "cat", labelKey: "filterCats" },
];

/** Filtra en el cliente sobre el listado que trae el servidor; son pocas fichas. */
export function AdoptionBrowser({ listings }: { listings: AdoptionListing[] }) {
  const t = useTranslations("adoption");
  const [filter, setFilter] = useState<AdoptionFilter>({});
  const visible = filterAdoptions(listings, filter);

  const chip = (active: boolean) =>
    `h-10 rounded-full px-4 text-sm ${
      active
        ? "bg-inverse font-bold text-on-inverse"
        : "border border-line bg-surface font-semibold text-ink-2 hover:bg-surface-2"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">{t("filtersLabel")}</legend>
        {SPECIES_OPTIONS.map(({ value, labelKey }) => (
          <button
            key={labelKey}
            type="button"
            aria-pressed={filter.species === value}
            onClick={() => setFilter((current) => ({ ...current, species: value }))}
            className={chip(filter.species === value)}
          >
            {t(labelKey)}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={Boolean(filter.urgentOnly)}
          onClick={() => setFilter((current) => ({ ...current, urgentOnly: !current.urgentOnly }))}
          className={chip(Boolean(filter.urgentOnly))}
        >
          {t("urgentOnly")}
        </button>
      </fieldset>

      {visible.length === 0 ? (
        <EmptyState
          icon={<AdoptionIcon size={44} />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <button
              type="button"
              onClick={() => setFilter({})}
              className="mt-2 h-12 rounded-2xl bg-inverse px-6 text-[15px] font-bold text-on-inverse"
            >
              {t("clearFilters")}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((listing) => (
            <AdoptionCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
