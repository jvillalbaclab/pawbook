import { fmt } from "@/i18n/formatters";

type TimeLabelProps = {
  /** Fecha ISO 8601. */
  date: string;
  /** relative: "hace 2 h"; clock: "10:41"; conversation: hora, "ayer", día o fecha. */
  variant?: "relative" | "clock" | "conversation";
  className?: string;
};

/**
 * Fecha legible con la fecha completa en el título y el valor ISO en <time dateTime>.
 * suppressHydrationWarning: el texto depende del "ahora" y de la zona horaria del
 * navegador, que pueden diferir de los del servidor; React conserva el valor del cliente.
 */
export function TimeLabel({ date, variant = "relative", className }: TimeLabelProps) {
  const text =
    variant === "clock"
      ? fmt.clock(date)
      : variant === "conversation"
        ? fmt.conversationTime(date)
        : fmt.relative(date);
  return (
    <time
      dateTime={date}
      title={fmt.fullDateTime(date)}
      className={className}
      suppressHydrationWarning
    >
      {text}
    </time>
  );
}
