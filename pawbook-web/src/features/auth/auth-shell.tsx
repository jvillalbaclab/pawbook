import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AdoptionIcon, ImageIcon, PawIcon } from "@/design-system/icons";
import { Logo } from "@/design-system/logo";

/** Pilares del producto (claves de "registration.pillars"). */
const PILLARS = [
  { icon: ImageIcon, key: "profile" },
  { icon: PawIcon, key: "pawmates" },
  { icon: AdoptionIcon, key: "adoption" },
] as const;

/**
 * Armazón de las pantallas de acceso (Desktop-Registro / Onb-Registro): en escritorio, panel
 * de marca oscuro a la izquierda y el formulario a la derecha; en móvil, solo el formulario
 * con el logo arriba. Lo comparten registro, login, recuperación y verificación de correo.
 */
export function AuthShell({
  title,
  mobileTitle,
  description,
  children,
  footer,
}: {
  title: string;
  /** Título en móvil, donde no se ve el panel de marca. Por defecto, `title`. */
  mobileTitle?: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useTranslations("registration");
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Panel de marca: siempre oscuro, en los dos temas. */}
      <section className="hidden flex-1 flex-col gap-9 bg-stone-900 px-14 py-12 text-stone-50 lg:flex">
        <Logo />
        <div className="max-w-[520px]">
          <p className="font-display text-[46px] leading-[1.06] font-extrabold tracking-tight">
            {t("heroTitle")}
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-stone-300">{t("heroDescription")}</p>
        </div>
        <ul className="flex max-w-[480px] flex-col gap-4">
          {PILLARS.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-[#3a2620] text-[#ff8a6b]">
                <Icon size={22} />
              </span>
              <span>
                <span className="block font-bold">{t(`pillars.${key}.title`)}</span>
                <span className="mt-0.5 block text-sm text-stone-300">
                  {t(`pillars.${key}.text`)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <main className="flex flex-1 items-center justify-center px-6 py-8 lg:px-8">
        <div className="flex w-full max-w-[420px] flex-col gap-5">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div>
            <h1 className="font-display text-[28px] font-extrabold tracking-tight text-ink lg:text-[30px]">
              {mobileTitle ? (
                <>
                  <span className="lg:hidden">{mobileTitle}</span>
                  <span className="hidden lg:inline">{title}</span>
                </>
              ) : (
                title
              )}
            </h1>
            {description ? <p className="mt-1.5 text-[15px] text-ink-2">{description}</p> : null}
          </div>
          {children}
          {footer ? (
            <div className="border-t border-line pt-3 text-center text-sm text-ink-2">{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
