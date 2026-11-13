import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: "brand" | "neutral" | "danger";
};

const TONE_CLASSES = {
  brand: "bg-primary-tint text-brand",
  neutral: "bg-surface-2 text-muted",
  danger: "bg-danger-tint text-danger-ink",
};

/** Patrón común de estados vacíos y de error: qué pasa, por qué y una acción (UI-004). */
export function EmptyState({ icon, title, description, action, tone = "brand" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div
        className={`flex size-24 items-center justify-center rounded-full ${TONE_CLASSES[tone]}`}
      >
        {icon}
      </div>
      <h2 className="mt-1 font-display text-xl font-extrabold text-ink">{title}</h2>
      <p className="max-w-sm text-[15px] leading-relaxed text-ink-2">{description}</p>
      {action}
    </div>
  );
}

/** Esqueleto de una tarjeta de publicación mientras carga. */
export function PostSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-[22px] border border-line bg-surface"
    >
      <div className="flex items-center gap-2.5 p-3.5">
        <span className="size-10 rounded-full bg-skeleton" />
        <div className="flex flex-col gap-1.5">
          <span className="h-3 w-28 rounded-full bg-skeleton" />
          <span className="h-2.5 w-44 rounded-full bg-surface-2" />
        </div>
      </div>
      <div className="aspect-[5/4] bg-surface-2 lg:aspect-[16/10]" />
      <div className="flex flex-col gap-2 p-3.5">
        <span className="h-3 w-11/12 rounded-full bg-skeleton" />
        <span className="h-3 w-2/3 rounded-full bg-skeleton" />
      </div>
    </div>
  );
}
