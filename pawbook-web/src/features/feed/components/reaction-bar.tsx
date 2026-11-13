import type { ComponentType } from "react";
import { BoneIcon, FishIcon, HeartIcon, PawIcon } from "@/design-system/icons";
import type { ReactionCounts, ReactionKind } from "@/lib/types";

const REACTIONS: { kind: ReactionKind; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { kind: "paw", label: "huella", icon: PawIcon },
  { kind: "heart", label: "corazón", icon: HeartIcon },
  { kind: "bone", label: "hueso", icon: BoneIcon },
  { kind: "fish", label: "pez", icon: FishIcon },
];

type ReactionBarProps = {
  counts: ReactionCounts;
  mine: ReactionKind | null;
  onReact: (kind: ReactionKind) => void;
};

export function ReactionBar({ counts, mine, onReact }: ReactionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTIONS.map(({ kind, label, icon: Icon }) => {
        const active = mine === kind;
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={active}
            aria-label={`Reacción ${label}, ${counts[kind]}`}
            onClick={() => onReact(kind)}
            className={`flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[13px] tabular-nums transition-colors ${
              active
                ? "border-primary-line bg-primary-tint font-bold text-primary-ink"
                : "border-line bg-surface font-semibold text-ink-2 hover:bg-surface-2"
            }`}
          >
            <Icon size={17} />
            {counts[kind]}
          </button>
        );
      })}
    </div>
  );
}
