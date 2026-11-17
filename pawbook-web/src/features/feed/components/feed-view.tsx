"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PawIcon } from "@/design-system/icons";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PostSkeleton,
  STATE_ACTION_CLASSES,
  viewStateOf,
} from "@/design-system/states";
import type { FeedTab } from "@/lib/types";
import { useRequiredActivePet } from "@/stores/active-pet";
import { useFeed, useReact, useToggleSave } from "../use-feed";
import { Composer } from "./composer";
import { PostCard } from "./post-card";

const TABS: { id: FeedTab; labelKey: "forYou" | "following" }[] = [
  { id: "for-you", labelKey: "forYou" },
  { id: "following", labelKey: "following" },
];

export function FeedView() {
  const t = useTranslations("feed");
  const activePet = useRequiredActivePet();
  const [tab, setTab] = useState<FeedTab>("for-you");
  const feed = useFeed(tab, activePet.id);
  const react = useReact();
  const toggleSave = useToggleSave();
  const state = viewStateOf(feed);

  return (
    <div className="flex flex-col gap-4">
      <Composer activePet={activePet} />

      <div role="tablist" aria-label={t("tabsLabel")} className="flex gap-1.5">
        {TABS.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`h-10 rounded-full px-[18px] text-sm ${
              tab === id
                ? "bg-inverse font-bold text-on-inverse"
                : "border border-line bg-surface font-semibold text-ink-2 hover:bg-surface-2"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {state === "loading" && (
        <LoadingState label={t("loading")}>
          <PostSkeleton />
          <PostSkeleton />
        </LoadingState>
      )}

      {state === "error" && (
        <ErrorState
          icon={<PawIcon size={44} />}
          title={t("errorTitle")}
          description={t("errorDescription")}
          onRetry={() => feed.refetch()}
          secondaryAction={
            <Link href="/adopcion" className={STATE_ACTION_CLASSES.link}>
              {t("errorFallbackLink")}
            </Link>
          }
        />
      )}

      {state === "empty" && (
        <EmptyState
          icon={<PawIcon size={52} />}
          title={t("emptyTitle", { name: activePet.name })}
          description={t("emptyDescription")}
          action={
            <button
              type="button"
              onClick={() => setTab("for-you")}
              className={STATE_ACTION_CLASSES.primary}
            >
              {t("emptyAction")}
            </button>
          }
        />
      )}

      {state === "ready" &&
        feed.data?.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            activePet={activePet}
            onReact={(kind) => react.mutate({ postId: post.id, kind })}
            onToggleSave={() => toggleSave.mutate(post.id)}
          />
        ))}

      {state === "ready" && (
        <p className="py-4 text-center text-sm text-muted">
          {t("upToDate")}{" "}
          <Link href="/pawmates" className="font-semibold text-primary-ink">
            {t("findPawmates")}
          </Link>
        </p>
      )}
    </div>
  );
}
