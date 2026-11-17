import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import { BoneIcon, FishIcon, HeartIcon, PawIcon } from "@/design-system/icons";
import { fmt } from "@/i18n/formatters";
import type { ReactionCounts, ReactionKind } from "@/lib/types";

const REACTIONS: { kind: ReactionKind; icon: ComponentType<{ size?: number }> }[] = [
  { kind: "paw", icon: PawIcon },
  { kind: "heart", icon: HeartIcon },
  { kind: "bone", icon: BoneIcon },
  { kind: "fish", icon: FishIcon },
];

type ReactionBarProps = {
  counts: ReactionCounts;
  mine: ReactionKind | null;
  onReact: (kind: ReactionKind) => void;
};

export function ReactionBar({ counts, mine, onReact }: ReactionBarProps) {
  const t = useTranslations("post");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTIONS.map(({ kind, icon: Icon }) => {
        const active = mine === kind;
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={active}
            aria-label={t("reaction", { label: t(`reactions.${kind}`), count: counts[kind] })}
            onClick={() => onReact(kind)}
            className={`flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[13px] tabular-nums transition-colors ${
              active
                ? "border-primary-line bg-primary-tint font-bold text-primary-ink"
                : "border-line bg-surface font-semibold text-ink-2 hover:bg-surface-2"
            }`}
          >
            <Icon size={17} />
            {fmt.compact(counts[kind])}
          </button>
        );
      })}
    </div>
  );
}
