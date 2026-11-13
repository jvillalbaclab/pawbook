import Link from "next/link";
import { ChevronLeftIcon } from "@/design-system/icons";

const STEPS = [1, 2, 3] as const;
const TOTAL_STEPS = STEPS.length;

export function OnboardingHeader({ step, backHref }: { step: number; backHref: string }) {
  return (
    <header className="flex items-center gap-2">
      <Link
        href={backHref}
        aria-label="Volver"
        className="flex size-11 shrink-0 items-center justify-center rounded-[14px] text-ink"
      >
        <ChevronLeftIcon size={22} />
      </Link>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={step}
        aria-label={`Paso ${step} de ${TOTAL_STEPS}`}
        className="grid flex-1 grid-cols-3 gap-1.5"
      >
        {STEPS.map((stepNumber) => (
          <span
            key={stepNumber}
            className={`h-1.5 rounded-full ${stepNumber <= step ? "bg-primary" : "bg-line"}`}
          />
        ))}
      </div>
      <span className="ml-1.5 text-xs font-bold text-muted">
        {step} de {TOTAL_STEPS}
      </span>
    </header>
  );
}
