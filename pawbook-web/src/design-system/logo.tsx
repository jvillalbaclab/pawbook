import Link from "next/link";
import { PawIcon } from "./icons";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 text-ink" aria-label="PawBook, inicio">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white">
        <PawIcon size={21} />
      </span>
      {!compact && (
        <span className="font-display text-[22px] font-extrabold tracking-tight">PawBook</span>
      )}
    </Link>
  );
}
