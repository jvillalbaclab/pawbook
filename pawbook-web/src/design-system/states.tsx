import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/*
 * Estados reutilizables de cada vista (UI-004): carga, vacío y error.
 * Patrón común: qué pasa, por qué y una acción para salir del estado.
 */

type Tone = "brand" | "neutral" | "danger";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: Tone;
  /** "alert" anuncia el estado a lectores de pantalla (errores); por defecto no se anuncia. */
  role?: "alert" | "status";
};

const TONE_CLASSES: Record<Tone, string> = {
  brand: "bg-primary-tint text-brand",
  neutral: "bg-surface-2 text-muted",
  danger: "bg-danger-tint text-danger-ink",
};

const BUTTON_BASE = "mt-2 flex h-12 items-center rounded-2xl px-6 text-[15px] font-bold";

/** Clases de los botones de acción de los estados, para usarlas también en enlaces. */
export const STATE_ACTION_CLASSES = {
  primary: `${BUTTON_BASE} bg-primary text-white hover:bg-primary-hover`,
  inverse: `${BUTTON_BASE} bg-inverse text-on-inverse`,
  link: "text-sm font-semibold text-primary-ink underline-offset-2 hover:underline",
} as const;

/** Estado vacío: la vista funciona pero no hay nada que mostrar. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "brand",
  role,
}: EmptyStateProps) {
  return (
    <div role={role} className="flex flex-col items-center gap-3 px-6 py-12 text-center">
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

type ErrorStateProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  /** Si se pasa, muestra "Reintentar". */
  onRetry?: () => void;
  /** Acción secundaria, p. ej. un enlace a una sección que sí funciona. */
  secondaryAction?: ReactNode;
};

/** Estado de error de una vista: se anuncia y ofrece reintentar. */
export function ErrorState({
  icon,
  title,
  description,
  onRetry,
  secondaryAction,
}: ErrorStateProps) {
  const t = useTranslations("states");
  return (
    <EmptyState
      role="alert"
      tone="neutral"
      icon={icon}
      title={title}
      description={description ?? t("genericErrorDescription")}
      action={
        onRetry || secondaryAction ? (
          <div className="flex flex-col items-center gap-3">
            {onRetry && (
              <button type="button" onClick={onRetry} className={STATE_ACTION_CLASSES.inverse}>
                {t("retry")}
              </button>
            )}
            {secondaryAction}
          </div>
        ) : undefined
      }
    />
  );
}

/** Contenedor de carga: anuncia el estado una vez y oculta los esqueletos a lectores. */
export function LoadingState({
  label,
  children,
  className = "flex flex-col gap-4",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </div>
  );
}

/** Bloque de esqueleto; la animación se desactiva con prefers-reduced-motion. */
export function Skeleton({ className }: { className: string }) {
  return (
    <span className={`block animate-pulse bg-skeleton motion-reduce:animate-none ${className}`} />
  );
}

/** Esqueleto de una tarjeta de publicación mientras carga. */
export function PostSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex items-center gap-2.5 p-3.5">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-2.5 w-44 rounded-full" />
        </div>
      </div>
      <Skeleton className="aspect-[5/4] lg:aspect-[16/10]" />
      <div className="flex flex-col gap-2 p-3.5">
        <Skeleton className="h-3 w-11/12 rounded-full" />
        <Skeleton className="h-3 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

/** Esqueleto de una fila de lista (conversaciones, sugerencias...). */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 lg:px-5">
      <Skeleton className="size-[46px] shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3 w-1/3 rounded-full" />
        <Skeleton className="h-2.5 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

export type ViewState = "loading" | "error" | "empty" | "ready";

/**
 * Decide qué estado pintar a partir de una consulta (forma compatible con TanStack Query).
 * Si hay datos en caché y falla un refresco, se siguen mostrando los datos.
 */
export function viewStateOf<T>(
  query: { isError: boolean; data: T | undefined },
  isEmpty: (data: T) => boolean = (data) => Array.isArray(data) && data.length === 0,
): ViewState {
  if (query.data !== undefined) return isEmpty(query.data) ? "empty" : "ready";
  if (query.isError) return "error";
  return "loading";
}
