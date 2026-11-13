"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/design-system/avatar";
import type { Pet } from "@/lib/types";

/** Meta del PRD: seguir al menos 5 mascotas para llenar el feed (objetivo "Red"). */
const FOLLOW_TARGET = 5;

export function FollowSuggestions({ pets }: { pets: Pet[] }) {
  const [followed, setFollowed] = useState<Set<string>>(() => new Set());
  const target = Math.min(FOLLOW_TARGET, pets.length);
  const progress = Math.min(followed.size / target, 1);

  function toggle(id: string) {
    setFollowed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <ul className="flex flex-col">
        {pets.map((pet) => {
          const isFollowing = followed.has(pet.id);
          return (
            <li
              key={pet.id}
              className="flex items-center gap-3 border-b border-line-soft py-2.5 last:border-0"
            >
              <Avatar name={pet.name} tone={pet.tone} size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-ink">{pet.name}</p>
                <p className="truncate text-xs text-muted">
                  @{pet.handle} · {pet.breed}
                </p>
              </div>
              <button
                type="button"
                aria-pressed={isFollowing}
                onClick={() => toggle(pet.id)}
                className={`h-9 rounded-full px-4 text-[13px] font-bold ${
                  isFollowing
                    ? "border border-line-strong bg-surface text-ink-2"
                    : "bg-inverse text-on-inverse"
                }`}
              >
                {isFollowing ? "Siguiendo" : "Seguir"}
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="sticky bottom-0 mt-auto flex flex-col gap-1.5 border-t border-line bg-canvas pt-3.5 pb-4">
        <div className="flex items-center gap-2.5 text-[13px] font-semibold text-ink-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          {followed.size} de {target} seguidas
        </div>
        <Link
          href="/"
          className="mt-1.5 flex h-[52px] items-center justify-center rounded-2xl bg-primary text-[15px] font-bold text-white hover:bg-primary-hover"
        >
          Ir a mi feed
        </Link>
        <Link
          href="/"
          className="flex h-10 items-center justify-center text-sm font-semibold text-ink-2"
        >
          Omitir por ahora
        </Link>
      </footer>
    </>
  );
}
