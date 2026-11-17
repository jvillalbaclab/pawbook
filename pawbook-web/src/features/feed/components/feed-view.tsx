"use client";

import Link from "next/link";
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
import { useActivePet } from "@/stores/active-pet";
import { useFeed, useReact, useToggleSave } from "../use-feed";
import { Composer } from "./composer";
import { PostCard } from "./post-card";

const TABS: { id: FeedTab; label: string }[] = [
  { id: "for-you", label: "Para ti" },
  { id: "following", label: "Siguiendo" },
];

export function FeedView() {
  const activePet = useActivePet();
  const [tab, setTab] = useState<FeedTab>("for-you");
  const feed = useFeed(tab, activePet.id);
  const react = useReact();
  const toggleSave = useToggleSave();
  const state = viewStateOf(feed);

  return (
    <div className="flex flex-col gap-4">
      <Composer activePet={activePet} />

      <div role="tablist" aria-label="Feed" className="flex gap-1.5">
        {TABS.map(({ id, label }) => (
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
            {label}
          </button>
        ))}
      </div>

      {state === "loading" && (
        <LoadingState label="Cargando publicaciones">
          <PostSkeleton />
          <PostSkeleton />
        </LoadingState>
      )}

      {state === "error" && (
        <ErrorState
          icon={<PawIcon size={44} />}
          title="No pudimos cargar el feed"
          description="No es tu conexión: estamos teniendo un problema. Tus publicaciones están a salvo."
          onRetry={() => feed.refetch()}
          secondaryAction={
            <Link href="/adopcion" className={STATE_ACTION_CLASSES.link}>
              Mientras tanto, ver animales en adopción
            </Link>
          }
        />
      )}

      {state === "empty" && (
        <EmptyState
          icon={<PawIcon size={52} />}
          title={`${activePet.name} todavía no sigue a nadie`}
          description="Cuando siga a otras mascotas, sus publicaciones aparecerán aquí, de la más reciente a la más antigua."
          action={
            <button
              type="button"
              onClick={() => setTab("for-you")}
              className={STATE_ACTION_CLASSES.primary}
            >
              Ver lo popular en Para ti
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
          Estás al día.{" "}
          <Link href="/pawmates" className="font-semibold text-primary-ink">
            Busca PawMates cerca
          </Link>
        </p>
      )}
    </div>
  );
}
